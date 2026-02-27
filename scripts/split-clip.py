import onnx
from onnx.utils import extract_model

model_dir = ".models/laion-CLIP-ViT-B-32-laion2B-s34B-b79K"
model_path = f"{model_dir}/model.onnx"
model = onnx.load(model_path)
print("Model loaded successfully.")

extract_model(
    model_path, f"{model_dir}/vision_model.onnx", ["pixel_values"], ["image_embeds"]
)
vision_model = onnx.load(f"{model_dir}/vision_model.onnx")
print("Vision model extracted and loaded successfully.")

extract_model(
    model_path,
    f"{model_dir}/text_model.onnx",
    ["input_ids", "attention_mask"],
    ["text_embeds"],
)
text_model = onnx.load(f"{model_dir}/text_model.onnx")
print("Text model extracted and loaded successfully.")
