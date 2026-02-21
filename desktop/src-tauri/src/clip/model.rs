use ort::ep::{CoreML, ExecutionProvider, XNNPACK};
use ort::session::builder::GraphOptimizationLevel;
use std::path::Path;

const CONTEXT_LENGTH: usize = 77;
const EOT_TOKEN_ID: i64 = 49_407;
const IMAGE_SIZE: u32 = 224;

const MEAN: [f32; 3] = [0.48145466, 0.4578275, 0.40821073];
const STD: [f32; 3] = [0.26862954, 0.261_302_6, 0.275_777_1];

pub struct ClipModel {
    session: ort::session::Session,
    tokenizer: tokenizers::Tokenizer,
}

impl ClipModel {
    pub fn new(model_path: &Path, tokenizer_path: &Path) -> anyhow::Result<Self> {
        log::debug!("CoreML available: {:?}", XNNPACK::default().is_available());
        log::debug!(
            "CoreML supported on platform: {}",
            XNNPACK::default().supported_by_platform()
        );
        let session = ort::session::Session::builder()?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_execution_providers([XNNPACK::default().build()])?
            .with_intra_threads(4)?
            .commit_from_file(model_path)?;

        let tokenizer = tokenizers::Tokenizer::from_file(tokenizer_path)
            .map_err(|e| anyhow::anyhow!("Failed to load tokenizer: {e}"))?;

        Ok(Self { session, tokenizer })
    }

    fn tokenize(&self, string: &str) -> anyhow::Result<(Vec<i64>, Vec<i64>)> {
        let encoding = self
            .tokenizer
            // CLIP relies on BOS/EOS special tokens for correct text pooling.
            .encode(string, true)
            .map_err(|e| anyhow::anyhow!("Tokenization failed: {e}"))?;

        let mut ids: Vec<i64> = encoding.get_ids().iter().map(|&id| id as i64).collect();
        let mut mask: Vec<i64> = encoding
            .get_attention_mask()
            .iter()
            .map(|&m| m as i64)
            .collect();

        if ids.len() > CONTEXT_LENGTH {
            ids.truncate(CONTEXT_LENGTH);
            mask.truncate(CONTEXT_LENGTH);
            // preserve EOS even when truncating long prompts.
            ids[CONTEXT_LENGTH - 1] = EOT_TOKEN_ID;
        }

        // pad or truncate to CONTEXT_LENGTH
        let mut input_ids = vec![0i64; CONTEXT_LENGTH];
        let mut attention_mask = vec![0i64; CONTEXT_LENGTH];
        let len = ids.len().min(CONTEXT_LENGTH);
        input_ids[..len].copy_from_slice(&ids[..len]);
        attention_mask[..len].copy_from_slice(&mask[..len]);

        Ok((input_ids, attention_mask))
    }

    pub fn embed_text(&mut self, string: &str) -> anyhow::Result<ndarray::Array1<f32>> {
        let (input_ids, attention_mask) = self.tokenize(string)?;

        let input_ids = ndarray::Array2::<i64>::from_shape_vec((1, CONTEXT_LENGTH), input_ids)?;
        let attention_mask =
            ndarray::Array2::<i64>::from_shape_vec((1, CONTEXT_LENGTH), attention_mask)?;
        // dummy pixel_values (1x3xIMAGE_SIZExIMAGE_SIZE) — not used for text, but required by the model
        let pixel_values =
            ndarray::Array4::<f32>::zeros((1, 3, IMAGE_SIZE as usize, IMAGE_SIZE as usize));

        let input_ids = ort::value::Tensor::from_array(input_ids)?;
        let attention_mask = ort::value::Tensor::from_array(attention_mask)?;
        let pixel_values = ort::value::Tensor::from_array(pixel_values)?;

        let outputs = self.session.run(
            ort::inputs!["input_ids" => input_ids, "pixel_values" => pixel_values, "attention_mask" => attention_mask],
        )?;

        let (_, embedding_data) = outputs["text_embeds"].try_extract_tensor::<f32>()?;
        let embedding = ndarray::Array1::from_vec(embedding_data.to_vec());
        let normalized = normalize_embed(embedding);
        Ok(normalized)
    }

    fn preprocess_image(&self, image_path: &Path) -> anyhow::Result<ndarray::Array4<f32>> {
        let mut img = image::open(image_path)?;

        img = img.resize_exact(
            IMAGE_SIZE,
            IMAGE_SIZE,
            image::imageops::FilterType::Lanczos3,
        );

        let rgb_img = img.to_rgb8();
        let mut input_data =
            ndarray::Array4::<f32>::zeros((1, 3, IMAGE_SIZE as usize, IMAGE_SIZE as usize));

        for y in 0..IMAGE_SIZE {
            for x in 0..IMAGE_SIZE {
                let pixel = rgb_img.get_pixel(x, y);
                // for each color band in RGB we fetch the mean and std
                for c in 0..3 {
                    input_data[[0, c, y as usize, x as usize]] =
                        (pixel[c] as f32 / 255.0 - MEAN[c]) / STD[c];
                }
            }
        }
        Ok(input_data)
    }

    pub fn batch_embed_images(
        &mut self,
        image_paths: Vec<&Path>,
    ) -> anyhow::Result<Vec<ndarray::Array1<f32>>> {
        let mut timer = timelog::Timer::new();
        timer.time("preprocess_image");
        let arrays: Vec<ndarray::Array4<f32>> = image_paths
            .iter()
            .map(|p| self.preprocess_image(p))
            .collect::<anyhow::Result<_>>()?;
        let views: Vec<_> = arrays.iter().map(|a| a.view()).collect();
        let pixel_values = ndarray::concatenate(ndarray::Axis(0), &views)?;
        log::info!(
            "Preprocessing {} images took {} ms",
            image_paths.len(),
            timer.time_end("preprocess_image", true)
        );
        // let pixel_values = self.preprocess_image(image_path)?;
        // dummy text inputs — not used for image, but required by the model
        let input_ids = ndarray::Array2::<i64>::zeros((1, CONTEXT_LENGTH));
        let attention_mask = ndarray::Array2::<i64>::zeros((1, CONTEXT_LENGTH));

        let input_ids = ort::value::Tensor::from_array(input_ids)?;
        let attention_mask = ort::value::Tensor::from_array(attention_mask)?;
        let pixel_values = ort::value::Tensor::from_array(pixel_values)?;

        let outputs = self.session.run(
            ort::inputs!["input_ids" => input_ids, "pixel_values" => pixel_values, "attention_mask" => attention_mask],
        )?;

        let (shape, embedding_data) = outputs["image_embeds"].try_extract_tensor::<f32>()?;
        let batch = shape[0] as usize;
        let dim = shape[1] as usize;

        let embeds = ndarray::Array2::from_shape_vec((batch, dim), embedding_data.to_vec())?;

        let normalized: Vec<ndarray::Array1<f32>> = embeds
            .axis_iter(ndarray::Axis(0))
            .map(|row| normalize_embed(row.to_owned()))
            .collect();
        Ok(normalized)
    }
}

fn normalize_embed(embedding: ndarray::Array1<f32>) -> ndarray::Array1<f32> {
    let norm = embedding.dot(&embedding).sqrt();
    log::debug!("Image embedding norm before normalization: {}", norm);
    let normalized = embedding / norm;
    let post_norm = normalized.dot(&normalized).sqrt();
    log::debug!("Image embedding norm after normalization: {}", post_norm);

    normalized
}
