use std::io;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum MyCustomError {
    #[error(transparent)]
    File(#[from] io::Error),

    #[error(transparent)]
    Anyhow(#[from] anyhow::Error),
}

impl serde::Serialize for MyCustomError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
