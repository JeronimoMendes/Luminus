PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "camera" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "maker" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    UNIQUE ("maker", "model")
);

CREATE TABLE IF NOT EXISTS "lens" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "maker" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    UNIQUE ("maker", "model")
);

CREATE TABLE IF NOT EXISTS "photograph" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "file_path" TEXT NOT NULL UNIQUE,
    "filename" TEXT NOT NULL,
    "datetime" TIMESTAMP,
    "aperture" REAL,
    "iso" INTEGER,
    "exposure_time" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "lens_id" INTEGER,
    "camera_id" INTEGER,
    FOREIGN KEY("lens_id") REFERENCES "lens"("id"),
    FOREIGN KEY("camera_id") REFERENCES "camera"("id")
);

CREATE TABLE IF NOT EXISTS "tag" (
    "text" TEXT PRIMARY KEY NOT NULL
);

CREATE TABLE IF NOT EXISTS "photograph_tag" (
    "tag" TEXT NOT NULL,
    "photograph_id" INTEGER NOT NULL,
    PRIMARY KEY ("tag", "photograph_id"),
    FOREIGN KEY("photograph_id") REFERENCES "photograph"("id"),
    FOREIGN KEY("tag") REFERENCES "tag"("text")
);

CREATE TABLE IF NOT EXISTS "project" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "name" TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "project_photograph" (
    "project_id" INTEGER NOT NULL,
    "photograph_id" INTEGER NOT NULL,
    PRIMARY KEY ("project_id", "photograph_id"),
    FOREIGN KEY("project_id") REFERENCES "project"("id"),
    FOREIGN KEY("photograph_id") REFERENCES "photograph"("id")
);

CREATE VIRTUAL TABLE vectors USING vec0(
    embedding float[512],
    +photograph_id INTEGER NOT NULL
);

CREATE TRIGGER delete_photograph_vectors
AFTER DELETE ON photograph
BEGIN
    DELETE FROM vectors WHERE photograph_id = OLD.id;
END;
