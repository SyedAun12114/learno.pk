-- Safe migration: add video columns if they don't exist
-- Run: npm run migrate

ALTER TABLE skill_path_steps ADD COLUMN video_url VARCHAR(1000) NULL;
ALTER TABLE skill_path_steps ADD COLUMN video_title VARCHAR(255) NULL;
