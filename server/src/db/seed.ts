import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { pool } from './index';

async function seed(): Promise<void> {
  console.log('Seeding database...');

  const adminHash = await bcrypt.hash('Admin@12345', 12);
  await pool.execute(
    'INSERT INTO users (email, password_hash, role, is_onboarded) VALUES (?, ?, "admin", 1) ON DUPLICATE KEY UPDATE role = "admin"',
    ['admin@learno.pk', adminHash]
  );

  const studentHash = await bcrypt.hash('Student@12345', 12);
  const [sr] = await pool.execute<mysql.ResultSetHeader>(
    'INSERT INTO users (email, password_hash, role, is_onboarded) VALUES (?, ?, "student", 1) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
    ['demo@learno.pk', studentHash]
  );
  let sid = sr.insertId;
  if (!sid) {
    const [er] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?', ['demo@learno.pk']
    );
    sid = (er as unknown as Array<{ id: number }>)[0]?.id || 1;
  }

  await pool.execute(
    'INSERT INTO student_profiles (user_id, full_name, age, education_level, institution, career_interest, daily_learning_minutes, academic_goal, career_goal, current_skills) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)',
    [sid, 'Demo Student', 20, 'Undergraduate', 'FAST NUCES', 'Frontend Development', 60,
     'Pass all exams with distinction', 'Become a professional frontend developer', 'HTML, CSS, Basic JavaScript']
  );

  const paths = [
    {
      title: 'Frontend Development',
      desc: 'Master HTML, CSS, JavaScript, and React.',
      cat: 'development', icon: 'Code2', hrs: 200,
      steps: [
        { n: 1, t: 'HTML Fundamentals', d: 'Semantic HTML5, forms, accessibility.', h: 10 },
        { n: 2, t: 'CSS & Styling', d: 'Flexbox, Grid, responsive design.', h: 20 },
        { n: 3, t: 'JavaScript Essentials', d: 'Variables, functions, arrays, DOM.', h: 30 },
        { n: 4, t: 'JavaScript Advanced', d: 'Async/await, Promises, ES6+.', h: 25 },
        { n: 5, t: 'Git & Version Control', d: 'Git, GitHub, branching.', h: 10 },
        { n: 6, t: 'React Fundamentals', d: 'Components, hooks, React Router.', h: 35 },
        { n: 7, t: 'Working with APIs', d: 'Fetch, Axios, REST APIs.', h: 20 },
        { n: 8, t: 'Build Your Portfolio', d: 'Create 3 real projects.', h: 50 },
      ],
    },
    {
      title: 'AI & Machine Learning',
      desc: 'Python, data science, and AI applications.',
      cat: 'development', icon: 'Brain', hrs: 250,
      steps: [
        { n: 1, t: 'Python Basics', d: 'Syntax, data structures, OOP.', h: 20 },
        { n: 2, t: 'NumPy & Pandas', d: 'Data manipulation and analysis.', h: 30 },
        { n: 3, t: 'Machine Learning', d: 'Supervised learning, scikit-learn.', h: 40 },
        { n: 4, t: 'Deep Learning', d: 'Neural networks, TensorFlow.', h: 50 },
        { n: 5, t: 'NLP Fundamentals', d: 'Text processing, transformers.', h: 40 },
        { n: 6, t: 'AI Projects', d: 'Three real-world AI applications.', h: 70 },
      ],
    },
    {
      title: 'UI/UX Design',
      desc: 'Design thinking, Figma, professional interfaces.',
      cat: 'design', icon: 'Layers', hrs: 150,
      steps: [
        { n: 1, t: 'Design Fundamentals', d: 'Color, typography, layout.', h: 15 },
        { n: 2, t: 'Figma Essentials', d: 'Components, auto-layout, prototyping.', h: 25 },
        { n: 3, t: 'UX Research', d: 'User research, personas.', h: 20 },
        { n: 4, t: 'Information Architecture', d: 'Wireframing, navigation.', h: 15 },
        { n: 5, t: 'Interaction Design', d: 'Microinteractions, usability.', h: 25 },
        { n: 6, t: 'Portfolio Projects', d: 'Three end-to-end design projects.', h: 50 },
      ],
    },
    {
      title: 'Digital Marketing',
      desc: 'SEO, social media, content, analytics.',
      cat: 'marketing', icon: 'TrendingUp', hrs: 120,
      steps: [
        { n: 1, t: 'Marketing Fundamentals', d: 'Strategy and buyer psychology.', h: 10 },
        { n: 2, t: 'SEO & Content', d: 'On-page SEO, keyword research.', h: 25 },
        { n: 3, t: 'Social Media', d: 'Instagram, LinkedIn, YouTube.', h: 20 },
        { n: 4, t: 'Paid Advertising', d: 'Google Ads, Facebook Ads.', h: 25 },
        { n: 5, t: 'Analytics', d: 'Google Analytics, conversion tracking.', h: 20 },
        { n: 6, t: 'Real Campaigns', d: 'Run 2 complete campaigns.', h: 20 },
      ],
    },
    {
      title: 'Data Analytics',
      desc: 'Excel, SQL, Python, data visualization.',
      cat: 'data', icon: 'BarChart3', hrs: 180,
      steps: [
        { n: 1, t: 'Excel', d: 'Pivot tables, VLOOKUP, data cleaning.', h: 15 },
        { n: 2, t: 'SQL', d: 'Queries, JOINs, aggregations.', h: 25 },
        { n: 3, t: 'Python Analytics', d: 'Pandas, NumPy, Matplotlib.', h: 35 },
        { n: 4, t: 'Data Visualization', d: 'Power BI, Tableau.', h: 30 },
        { n: 5, t: 'Statistics', d: 'Hypothesis testing, correlation.', h: 25 },
        { n: 6, t: 'Analytics Projects', d: 'Three data analysis projects.', h: 50 },
      ],
    },
    {
      title: 'Graphic Design',
      desc: 'Adobe tools, brand design, visual content.',
      cat: 'design', icon: 'Palette', hrs: 140,
      steps: [
        { n: 1, t: 'Design Principles', d: 'Balance, contrast, hierarchy.', h: 12 },
        { n: 2, t: 'Adobe Illustrator', d: 'Vector graphics, logo design.', h: 30 },
        { n: 3, t: 'Adobe Photoshop', d: 'Photo editing, compositing.', h: 28 },
        { n: 4, t: 'Typography & Branding', d: 'Brand identity, style guides.', h: 20 },
        { n: 5, t: 'Print & Digital', d: 'Social media, brochures.', h: 20 },
        { n: 6, t: 'Portfolio', d: 'Build portfolio and get clients.', h: 30 },
      ],
    },
  ]

  for (const p of paths) {
    const [r] = await pool.execute<mysql.ResultSetHeader>(
      'INSERT INTO skill_paths (title, description, category, total_steps, estimated_hours, icon, is_active) VALUES (?, ?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
      [p.title, p.desc, p.cat, p.steps.length, p.hrs, p.icon]
    );
    let pathId = r.insertId;
    if (!pathId) {
      const [ex] = await pool.execute<mysql.RowDataPacket[]>(
        'SELECT id FROM skill_paths WHERE title = ?', [p.title]
      );
      pathId = (ex as unknown as Array<{ id: number }>)[0]?.id || 0;
    }
    if (!pathId) continue;
    await pool.execute('UPDATE skill_paths SET total_steps = ? WHERE id = ?', [p.steps.length, pathId]);
    for (const s of p.steps) {
      await pool.execute(
        'INSERT INTO skill_path_steps (path_id, step_number, title, description, estimated_hours) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title)',
        [pathId, s.n, s.t, s.d, s.h]
      );
    }
  }

  const opps = [
    { t: 'Junior Frontend Developer Intern', c: 'TechNova Solutions (Demo)', d: 'Join our frontend team and build UIs with React. Paid internship with full-time potential.', tp: 'internship', l: 'Karachi, Pakistan', r: 0, sk: ['HTML', 'CSS', 'JavaScript', 'React'], e: 'Entry Level', u: 'https://example.com/apply', dl: '2025-12-31', f: 1 },
    { t: 'React Developer (Remote)', c: 'Pixel Labs (Demo)', d: 'Build SaaS product with our team. Flexible hours, remote-first.', tp: 'part_time', l: 'Remote', r: 1, sk: ['React', 'JavaScript', 'CSS', 'Git'], e: 'Junior', u: 'https://example.com/apply', dl: '2025-11-30', f: 1 },
    { t: 'UI/UX Design Intern', c: 'DesignCraft Studio (Demo)', d: 'Work on mobile and web design projects using Figma.', tp: 'internship', l: 'Lahore, Pakistan', r: 0, sk: ['Figma', 'UI Design', 'Wireframing'], e: 'Entry Level', u: 'https://example.com/apply', dl: '2025-10-31', f: 0 },
    { t: 'WordPress Website Freelance', c: 'Various Clients (Demo)', d: 'Build a 5-page WordPress website. Estimated 2 weeks of work.', tp: 'freelance', l: 'Remote', r: 1, sk: ['WordPress', 'HTML', 'CSS'], e: 'Beginner', u: 'https://example.com/apply', dl: null, f: 0 },
    { t: 'Data Analyst Trainee', c: 'InsightCorp Pakistan (Demo)', d: 'Analyze business data and create reports. Excel and SQL required.', tp: 'internship', l: 'Islamabad, Pakistan', r: 0, sk: ['Excel', 'SQL', 'Data Analysis'], e: 'Entry Level', u: 'https://example.com/apply', dl: '2025-12-15', f: 0 },
    { t: 'Social Media Manager Part-time', c: 'BrandBoost Agency (Demo)', d: 'Manage social media for 3 clients. Create content and track performance.', tp: 'part_time', l: 'Remote', r: 1, sk: ['Social Media', 'Content Writing', 'Canva'], e: 'Junior', u: 'https://example.com/apply', dl: null, f: 0 },
    { t: 'Python Developer AI Projects', c: 'AI Builders Lab (Demo)', d: 'Build AI tools using Python and LangChain. Fully remote.', tp: 'freelance', l: 'Remote', r: 1, sk: ['Python', 'AI/ML', 'APIs', 'LangChain'], e: 'Intermediate', u: 'https://example.com/apply', dl: '2025-11-15', f: 1 },
    { t: 'Graphic Designer Apprenticeship', c: 'Creative House (Demo)', d: '6-month apprenticeship learning full design workflow under mentorship.', tp: 'apprenticeship', l: 'Karachi, Pakistan', r: 0, sk: ['Adobe Illustrator', 'Adobe Photoshop', 'Typography'], e: 'Entry Level', u: 'https://example.com/apply', dl: '2025-10-15', f: 0 },
    { t: 'Junior Backend Developer', c: 'CloudStack Systems (Demo)', d: 'Build REST APIs with Node.js, Express, and MySQL.', tp: 'full_time', l: 'Lahore, Pakistan', r: 0, sk: ['Node.js', 'Express', 'MySQL', 'JavaScript'], e: 'Junior (1+ year)', u: 'https://example.com/apply', dl: '2025-12-01', f: 0 },
    { t: 'Content Writing Freelance', c: 'ContentPro (Demo)', d: 'Write tech blog articles on AI and web development. Ongoing work.', tp: 'freelance', l: 'Remote', r: 1, sk: ['Content Writing', 'Research', 'SEO'], e: 'Beginner', u: 'https://example.com/apply', dl: null, f: 0 },
  ]

  for (const o of opps) {
    await pool.execute(
      'INSERT INTO opportunities (title, company, description, type, location, is_remote, required_skills, experience_level, application_url, deadline, is_featured, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE title = VALUES(title)',
      [o.t, o.c, o.d, o.tp, o.l, o.r, JSON.stringify(o.sk), o.e, o.u, o.dl, o.f]
    );
  }

  console.log('');
  console.log('Seed complete!');
  console.log('  Admin:   admin@learno.pk  /  Admin@12345');
  console.log('  Student: demo@learno.pk   /  Student@12345');
  await pool.end();
}

seed().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
