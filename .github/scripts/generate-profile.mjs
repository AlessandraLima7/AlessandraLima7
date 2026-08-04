#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const USER = process.env.GITHUB_USER || 'AlessandraLima7';
const TOKEN = process.env.GITHUB_TOKEN;
const YEAR = new Date().getUTCFullYear();

const QUERY = `
query($login:String!,$from:DateTime!,$to:DateTime!){
  user(login:$login){
    login
    name
    location
    followers{totalCount}
    repositories(
      first:100,
      ownerAffiliations:OWNER,
      privacy:PUBLIC,
      isFork:false,
      orderBy:{field:UPDATED_AT,direction:DESC}
    ){
      totalCount
      nodes{
        name
        description
        url
        updatedAt
        stargazerCount
        forkCount
        primaryLanguage{name color}
      }
    }
    contributionsCollection(from:$from,to:$to){
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      contributionCalendar{
        totalContributions
        weeks{
          contributionDays{
            contributionCount
            date
            weekday
          }
        }
      }
    }
  }
}`;

async function fetchData() {
  if (!TOKEN) return mockData();

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'alessandra-profile-generator',
    },
    body: JSON.stringify({
      query: QUERY,
      variables: {
        login: USER,
        from: `${YEAR}-01-01T00:00:00Z`,
        to: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join('; '));
  }

  if (!payload.data?.user) {
    throw new Error(`Usuário ${USER} não encontrado.`);
  }

  return payload.data.user;
}

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function shorten(value = '', max = 68) {
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max - 1).trim()}…`;
}

function wrap(value = '', max = 29, maxLines = 3) {
  const source = String(value || 'Projeto de estudo e evolução prática.').trim();
  const words = source.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = next;
    }
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function mockData() {
  const weeks = [];
  for (let week = 0; week < 52; week += 1) {
    const contributionDays = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      contributionDays.push({
        contributionCount: 0,
        date: `${YEAR}-01-01`,
        weekday,
      });
    }
    weeks.push({ contributionDays });
  }

  return {
    login: USER,
    name: 'Alessandra Lima',
    location: 'Brasil',
    followers: { totalCount: 0 },
    repositories: {
      totalCount: 0,
      nodes: [
        {
          name: 'Perfil em atualização',
          description: 'As métricas reais aparecerão após a primeira execução do GitHub Actions.',
          updatedAt: new Date().toISOString(),
          stargazerCount: 0,
          forkCount: 0,
          primaryLanguage: { name: 'GitHub', color: '#ec4899' },
        },
      ],
    },
    contributionsCollection: {
      totalCommitContributions: 0,
      totalPullRequestContributions: 0,
      totalPullRequestReviewContributions: 0,
      contributionCalendar: {
        totalContributions: 0,
        weeks,
      },
    },
  };
}

function processData(user) {
  const repos = user.repositories.nodes.filter(
    (repo) => repo.name.toLowerCase() !== USER.toLowerCase(),
  );

  const stars = repos.reduce((total, repo) => total + repo.stargazerCount, 0);
  const forks = repos.reduce((total, repo) => total + repo.forkCount, 0);

  const languageMap = new Map();
  for (const repo of repos) {
    if (!repo.primaryLanguage) continue;
    const key = repo.primaryLanguage.name;
    const current = languageMap.get(key) || {
      name: key,
      color: repo.primaryLanguage.color || '#ec4899',
      count: 0,
    };
    current.count += 1;
    languageMap.set(key, current);
  }

  let languages = [...languageMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  if (!languages.length) {
    languages = [
      { name: 'HTML', color: '#e34c26', count: 1 },
      { name: 'CSS', color: '#663399', count: 1 },
      { name: 'JavaScript', color: '#f1e05a', count: 1 },
      { name: 'Python', color: '#3572A5', count: 1 },
    ];
  }

  const languageTotal = languages.reduce((total, item) => total + item.count, 0) || 1;
  languages = languages.map((item) => ({
    ...item,
    percentage: Math.round((item.count / languageTotal) * 100),
  }));

  const preferredNames = [
    'desafio-batalha-naval-AlessandraLima7',
    'cursos-ti-desafio-xadrez-DesafioXadrez',
    'desafio-l-gica-super-trunfo-AlessandraLima7',
    'desafio-cadastro-das-cartas-no-super-trunfo-AlessandraLima7',
    'dio-lab-open-source',
  ];

  const preferred = preferredNames
    .map((name) => repos.find((repo) => repo.name.toLowerCase() === name.toLowerCase()))
    .filter(Boolean);

  const ranked = [...repos].sort(
    (a, b) =>
      b.stargazerCount - a.stargazerCount ||
      new Date(b.updatedAt) - new Date(a.updatedAt),
  );

  const projects = [...preferred, ...ranked]
    .filter(
      (repo, index, array) =>
        array.findIndex((item) => item.name === repo.name) === index,
    )
    .slice(0, 3);

  while (projects.length < 3) {
    projects.push({
      name: 'Novo projeto em breve',
      description: 'Espaço reservado para uma nova solução publicada no GitHub.',
      stargazerCount: 0,
      forkCount: 0,
      primaryLanguage: { name: 'Em construção', color: '#a855f7' },
    });
  }

  return {
    user,
    repos,
    stars,
    forks,
    languages,
    projects,
    contributions: user.contributionsCollection,
  };
}

function buildSvg(data) {
  const { user, stars, languages, projects, contributions } = data;
  const W = 900;
  const H = 1280;
  const accents = ['#ec4899', '#22d3ee', '#a855f7', '#fb7185'];
  const techs = ['HTML', 'CSS', 'JAVASCRIPT', 'PYTHON', 'GIT', 'GITHUB', 'C', 'SQL'];

  const pillWidths = techs.map((tech) => Math.max(78, tech.length * 7.2 + 26));
  const totalPillsWidth =
    pillWidths.reduce((total, width) => total + width, 0) + (techs.length - 1) * 8;
  let pillX = (W - totalPillsWidth) / 2;

  const pills = techs
    .map((tech, index) => {
      const width = pillWidths[index];
      const x = pillX;
      pillX += width + 8;
      return `
      <g>
        <rect x="${x}" y="274" width="${width}" height="32" rx="16"
          fill="#0d1022" stroke="${accents[index % accents.length]}" stroke-opacity=".45"/>
        <text x="${x + width / 2}" y="295" text-anchor="middle"
          class="chip" fill="${accents[index % accents.length]}">${esc(tech)}</text>
      </g>`;
    })
    .join('');

  const statItems = [
    [user.repositories.totalCount, 'REPOSITÓRIOS', '#22d3ee'],
    [contributions.contributionCalendar.totalContributions, `CONTRIBUIÇÕES ${YEAR}`, '#ec4899'],
    [user.followers.totalCount, 'SEGUIDORES', '#a855f7'],
    [stars, 'ESTRELAS', '#facc15'],
  ];

  const stats = statItems
    .map(([value, label, color], index) => {
      const x = 48 + index * 201;
      return `
      <g>
        <rect x="${x}" y="342" width="185" height="108" rx="18" class="panel"/>
        <circle cx="${x + 26}" cy="371" r="5" fill="${color}" class="pulse"/>
        <text x="${x + 20}" y="414" class="stat">${esc(value)}</text>
        <text x="${x + 20}" y="438" class="label" fill="${color}">${esc(label)}</text>
      </g>`;
    })
    .join('');

  let languageBarX = 61;
  const languageBarParts = [];
  languages.forEach((language, index) => {
    const used = languageBarX - 61;
    const remaining = 778 - used;
    const width =
      index === languages.length - 1
        ? remaining
        : Math.min(remaining, Math.max(4, (778 * language.percentage) / 100));

    languageBarParts.push(
      `<rect x="${languageBarX}" y="523" width="${width}" height="12" rx="6" fill="${esc(language.color)}"/>`,
    );
    languageBarX += width;
  });

  const legend = languages
    .map((language, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 67 + col * 202;
      const y = 571 + row * 33;
      return `
      <g>
        <circle cx="${x}" cy="${y - 4}" r="5" fill="${esc(language.color)}"/>
        <text x="${x + 14}" y="${y}" class="legend">${esc(shorten(language.name, 16))}</text>
        <text x="${x + 160}" y="${y}" text-anchor="end" class="muted">${language.percentage}%</text>
      </g>`;
    })
    .join('');

  const levels = ['#11152a', '#3b164d', '#7e225f', '#ec4899', '#67e8f9'];
  const weeks = contributions.contributionCalendar.weeks.slice(-52);
  const calendarStartX = 112;
  const calendar = [];

  weeks.forEach((week, weekIndex) => {
    week.contributionDays.forEach((day) => {
      const count = day.contributionCount;
      const level =
        count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 9 ? 3 : 4;
      calendar.push(`
        <rect x="${calendarStartX + weekIndex * 13}" y="${713 + day.weekday * 13}"
          width="10" height="10" rx="2.5" fill="${levels[level]}">
          <title>${esc(day.date)}: ${count} contribuições</title>
        </rect>`);
    });
  });

  const cards = projects
    .map((project, index) => {
      const x = 48 + index * 268;
      const y = 892;
      const accent = accents[index % accents.length];
      const descriptionLines = wrap(project.description)
        .map(
          (line, lineIndex) =>
            `<text x="${x + 21}" y="${y + 83 + lineIndex * 19}" class="desc">${esc(line)}</text>`,
        )
        .join('');

      return `
      <g class="float" style="animation-delay:${index * 0.35}s">
        <rect x="${x}" y="${y}" width="250" height="215" rx="22"
          class="panel" stroke="${accent}" stroke-opacity=".4"/>
        <rect x="${x}" y="${y}" width="5" height="215" rx="2.5" fill="${accent}"/>
        <text x="${x + 20}" y="${y + 38}" class="index" fill="${accent}">0${index + 1}</text>
        <text x="${x + 57}" y="${y + 38}" class="project">${esc(shorten(project.name, 20))}</text>
        ${descriptionLines}
        <line x1="${x + 20}" y1="${y + 157}" x2="${x + 230}" y2="${y + 157}" stroke="#252944"/>
        <circle cx="${x + 25}" cy="${y + 185}" r="5"
          fill="${esc(project.primaryLanguage?.color || accent)}"/>
        <text x="${x + 37}" y="${y + 189}" class="meta">
          ${esc(project.primaryLanguage?.name || 'Projeto')}
        </text>
        <text x="${x + 230}" y="${y + 189}" text-anchor="end" class="meta">
          ★ ${project.stargazerCount}  ⑂ ${project.forkCount}
        </text>
      </g>`;
    })
    .join('');

  const particles = Array.from({ length: 24 }, (_, index) => {
    const x = 35 + ((index * 137) % 830);
    const y = 26 + ((index * 223) % 1210);
    const radius = 0.8 + (index % 4) * 0.45;
    const delay = (index % 8) * 0.55;
    const duration = 5.5 + (index % 6);
    const color = ['#67e8f9', '#f9a8d4', '#c4b5fd', '#ffffff'][index % 4];
    return `<circle class="particle" cx="${x}" cy="${y}" r="${radius}" fill="${color}"
      style="animation-delay:${delay}s;animation-duration:${duration}s"/>`;
  }).join('');

  return `<!-- Gerado automaticamente por .github/scripts/generate-profile.mjs -->
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
  role="img" aria-labelledby="title description">
  <title id="title">Perfil GitHub de Alessandra Lima</title>
  <desc id="description">Painel animado com tecnologias, métricas, atividade e projetos.</desc>

  <style>
    text{
      font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif
    }
    .eyebrow{font-size:11px;font-weight:900;letter-spacing:5px;fill:#67e8f9}
    .name{font-size:58px;font-weight:950;letter-spacing:3px;fill:#fdf2f8}
    .role{font-size:14px;font-weight:850;letter-spacing:3.5px;fill:#f9a8d4}
    .bio{font-size:13px;font-weight:500;fill:#aeb3c8}
    .muted,.meta{font-size:9px;font-weight:700;fill:#7b819f}
    .section{font-size:11px;font-weight:900;letter-spacing:4px;fill:#67e8f9}
    .chip{font-size:9px;font-weight:900;letter-spacing:1px}
    .panel{fill:#0b0e1d;stroke:#282c49}
    .stat{font-size:29px;font-weight:950;fill:#fff7fb}
    .label{font-size:8px;font-weight:900;letter-spacing:1.2px}
    .legend{font-size:11px;font-weight:750;fill:#e5e7f3}
    .index{font-size:10px;font-weight:950;letter-spacing:2px}
    .project{font-size:14px;font-weight:900;fill:#fff7fb}
    .desc{font-size:10.5px;font-weight:500;fill:#aeb3c8}
    .orb-a{animation:orbA 8s ease-in-out infinite;transform-origin:center}
    .orb-b{animation:orbB 10s ease-in-out infinite;transform-origin:center}
    .orb-c{animation:orbC 12s ease-in-out infinite;transform-origin:center}
    .scan{animation:scan 5.8s linear infinite}
    .pulse{animation:pulse 2.8s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
    .float{animation:float 6s ease-in-out infinite}
    .particle{opacity:.15;animation:particleFade 8s ease-in-out infinite}
    .ring{animation:ring 5s ease-in-out infinite;transform-origin:450px 140px}
    @keyframes orbA{50%{transform:translate(34px,-16px) scale(1.08)}}
    @keyframes orbB{50%{transform:translate(-38px,20px) scale(1.05)}}
    @keyframes orbC{50%{transform:translate(18px,28px) scale(.95)}}
    @keyframes scan{to{transform:translateX(1250px)}}
    @keyframes pulse{50%{transform:scale(1.65);opacity:.48}}
    @keyframes float{50%{transform:translateY(-5px)}}
    @keyframes particleFade{0%,100%{opacity:.08}50%{opacity:.75}}
    @keyframes ring{50%{transform:scale(1.08);opacity:.32}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>

  <defs>
    <radialGradient id="pink">
      <stop stop-color="#ec4899" stop-opacity=".62"/>
      <stop offset="1" stop-color="#ec4899" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cyan">
      <stop stop-color="#22d3ee" stop-opacity=".44"/>
      <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="purple">
      <stop stop-color="#a855f7" stop-opacity=".34"/>
      <stop offset="1" stop-color="#a855f7" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="scanner">
      <stop stop-color="#22d3ee" stop-opacity="0"/>
      <stop offset=".5" stop-color="#f9a8d4" stop-opacity=".42"/>
      <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
    </linearGradient>
    <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M42 0H0V42" fill="none" stroke="#ec4899" stroke-opacity=".05"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" rx="30" fill="#060713"/>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="29"
    fill="url(#grid)" stroke="#6d245c" stroke-opacity=".55"/>

  ${particles}
  <ellipse class="orb-a" cx="250" cy="130" rx="250" ry="150" fill="url(#pink)"/>
  <ellipse class="orb-b" cx="680" cy="145" rx="235" ry="140" fill="url(#cyan)"/>
  <ellipse class="orb-c" cx="465" cy="170" rx="220" ry="145" fill="url(#purple)"/>
  <circle class="ring" cx="450" cy="140" r="116" fill="none"
    stroke="#f9a8d4" stroke-opacity=".16"/>
  <circle class="ring" cx="450" cy="140" r="82" fill="none"
    stroke="#67e8f9" stroke-opacity=".12" style="animation-delay:.5s"/>
  <rect class="scan" x="-330" y="125" width="330" height="42" fill="url(#scanner)"/>

  <path d="M30 28V14H44" fill="none" stroke="#67e8f9" stroke-width="2.5"/>
  <path d="M870 28V14H856" fill="none" stroke="#f9a8d4" stroke-width="2.5"/>

  <text x="450" y="58" text-anchor="middle" class="eyebrow">
    TECNOLOGIA • APRENDIZADO • EVOLUÇÃO
  </text>
  <text x="450" y="140" text-anchor="middle" class="name">
    ALESSANDRA // LIMA
  </text>
  <text x="450" y="180" text-anchor="middle" class="role">
    DESENVOLVEDORA EM FORMAÇÃO  |  ADS
  </text>
  <text x="450" y="215" text-anchor="middle" class="bio">
    Transformando estudo, curiosidade e prática em soluções através da programação.
  </text>
  <text x="450" y="241" text-anchor="middle" class="muted">
    FRONT-END • BACK-END • github.com/${esc(user.login)}
  </text>

  ${pills}

  <line x1="48" y1="327" x2="852" y2="327" stroke="#282b47"/>
  ${stats}

  <line x1="48" y1="485" x2="852" y2="485" stroke="#282b47"/>
  <text x="61" y="510" class="section">STACK ANALYTICS</text>
  <text x="839" y="510" text-anchor="end" class="muted">
    LINGUAGEM PRINCIPAL POR REPOSITÓRIO PÚBLICO
  </text>
  <rect x="61" y="523" width="778" height="12" rx="6" fill="#15182e"/>
  ${languageBarParts.join('')}
  ${legend}

  <line x1="48" y1="652" x2="852" y2="652" stroke="#282b47"/>
  <text x="61" y="680" class="section">ACTIVITY PULSE</text>
  <text x="839" y="680" text-anchor="end" class="muted">
    ${contributions.totalCommitContributions} COMMITS •
    ${contributions.totalPullRequestContributions} PRs •
    ${contributions.totalPullRequestReviewContributions} REVIEWS EM ${YEAR}
  </text>
  ${calendar.join('')}

  <line x1="48" y1="850" x2="852" y2="850" stroke="#282b47"/>
  <text x="61" y="878" class="section">PRIMARY DEPLOYMENTS</text>
  ${cards}

  <line x1="48" y1="1152" x2="852" y2="1152" stroke="#282b47"/>
  <text x="450" y="1192" text-anchor="middle" class="eyebrow">
    APRENDER • CONSTRUIR • COMPARTILHAR
  </text>
  <text x="450" y="1224" text-anchor="middle" class="bio">
    Cada projeto é um passo concreto em direção ao mercado de tecnologia.
  </text>
  <text x="450" y="1254" text-anchor="middle" class="muted">
    ALESSANDRA LIMA • PERFIL ATUALIZADO AUTOMATICAMENTE
  </text>
</svg>`;
}

const user = await fetchData();
const data = processData(user);
const svg = buildSvg(data);

const outputDir = path.resolve(process.cwd(), '.github/assets');
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, 'profile.svg');
fs.writeFileSync(outputPath, svg, 'utf8');

console.log(`Perfil gerado em ${outputPath}`);
