CREATE TABLE IF NOT EXISTS user_sessions (
  sid VARCHAR(128) NOT NULL PRIMARY KEY,
  data MEDIUMTEXT NOT NULL,
  expires DATETIME NOT NULL,
  INDEX idx_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student','admin') NOT NULL DEFAULT 'student',
  is_onboarded TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_email (email),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  age INT UNSIGNED,
  education_level VARCHAR(100),
  institution VARCHAR(255),
  career_interest VARCHAR(255),
  daily_learning_minutes INT UNSIGNED DEFAULT 60,
  academic_goal TEXT,
  career_goal TEXT,
  current_skills TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_id (user_id),
  FOREIGN KEY fk_sp_user (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_subjects (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  subject_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_ss_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ss_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category ENUM('study','assignment','exam','skill','career','personal') NOT NULL DEFAULT 'personal',
  priority ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  status ENUM('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_task_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_task_user (user_id),
  INDEX idx_task_status (status),
  INDEX idx_task_due (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS study_plans (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(500) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  goal TEXT,
  exam_date DATE,
  total_days INT UNSIGNED,
  daily_minutes INT UNSIGNED DEFAULT 60,
  status ENUM('active','completed','paused') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_sp2_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sp_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS study_plan_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id INT UNSIGNED NOT NULL,
  day_number INT UNSIGNED NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  duration_minutes INT UNSIGNED DEFAULT 30,
  phase VARCHAR(100),
  status ENUM('pending','completed','skipped') NOT NULL DEFAULT 'pending',
  scheduled_date DATE,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_spi_plan (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE,
  INDEX idx_spi_plan (plan_id),
  INDEX idx_spi_date (scheduled_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_conversations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(500),
  context_type ENUM('general','study','skill','career') NOT NULL DEFAULT 'general',
  context_id INT UNSIGNED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_conv_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_conv_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  role ENUM('user','assistant') NOT NULL,
  content TEXT NOT NULL,
  tokens_used INT UNSIGNED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_msg_conv (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
  INDEX idx_msg_conv (conversation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_usage (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  request_type VARCHAR(100) NOT NULL,
  tokens_used INT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_usage_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_usage_user_date (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(500) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  topic VARCHAR(255),
  difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  total_questions INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_test_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_test_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS test_questions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  test_id INT UNSIGNED NOT NULL,
  question_number INT UNSIGNED NOT NULL,
  type ENUM('multiple_choice','short_answer') NOT NULL,
  question TEXT NOT NULL,
  options JSON,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_tq_test (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  INDEX idx_tq_test (test_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS test_attempts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  test_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  score DECIMAL(5,2),
  total_questions INT UNSIGNED NOT NULL,
  correct_count INT UNSIGNED DEFAULT 0,
  time_taken_seconds INT UNSIGNED,
  analysis TEXT,
  strengths TEXT,
  weak_areas TEXT,
  status ENUM('in_progress','completed') NOT NULL DEFAULT 'in_progress',
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_ta_test (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY fk_ta_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ta_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS test_answers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  user_answer TEXT,
  is_correct TINYINT(1),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_ans_attempt (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY fk_ans_question (question_id) REFERENCES test_questions(id) ON DELETE CASCADE,
  INDEX idx_ans_attempt (attempt_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS skill_paths (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  total_steps INT UNSIGNED DEFAULT 0,
  estimated_hours INT UNSIGNED,
  icon VARCHAR(100),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS skill_path_steps (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  path_id INT UNSIGNED NOT NULL,
  step_number INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_hours INT UNSIGNED,
  resources JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_sps_path (path_id) REFERENCES skill_paths(id) ON DELETE CASCADE,
  INDEX idx_sps_path (path_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_skill_enrollments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  path_id INT UNSIGNED NOT NULL,
  current_step INT UNSIGNED DEFAULT 1,
  progress_percent DECIMAL(5,2) DEFAULT 0,
  status ENUM('active','completed','paused') NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_enrollment (user_id, path_id),
  FOREIGN KEY fk_sse_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY fk_sse_path (path_id) REFERENCES skill_paths(id) ON DELETE CASCADE,
  INDEX idx_sse_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_skill_step_progress (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  step_id INT UNSIGNED NOT NULL,
  status ENUM('locked','active','completed') NOT NULL DEFAULT 'locked',
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_step_progress (user_id, step_id),
  FOREIGN KEY fk_sssp_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY fk_sssp_step (step_id) REFERENCES skill_path_steps(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS opportunities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  company VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  type ENUM('internship','freelance','part_time','full_time','apprenticeship') NOT NULL,
  location VARCHAR(255),
  is_remote TINYINT(1) NOT NULL DEFAULT 0,
  required_skills JSON,
  experience_level VARCHAR(100),
  application_url VARCHAR(1000),
  deadline DATE,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_opp_type (type),
  INDEX idx_opp_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saved_opportunities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  opportunity_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_saved (user_id, opportunity_id),
  FOREIGN KEY fk_so_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY fk_so_opp (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
  INDEX idx_so_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_activity (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  metadata JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_ua_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ua_user_date (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS migrations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_migration (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
