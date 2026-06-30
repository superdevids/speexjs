import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'

interface DeployOptions {
  docker?: boolean
  vercel?: boolean
  railway?: boolean
  render?: boolean
  flyio?: boolean
  init?: boolean
}

const TARGETS = ['docker', 'vercel', 'railway', 'render', 'flyio'] as const

function generateDockerfile(): string {
  return `# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["node", "dist/index.js"]
`
}

function generateDockerCompose(): string {
  return `services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://postgres:password@db:5432/app
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=app
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
`
}

function generateDockerignore(): string {
  return `node_modules
dist
.git
.env
.env.local
*.log
.DS_Store
coverage
.vscode
.idea
`
}

function generateVercelProject(): string {
  return `{
  "framework": null,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "devCommand": "npm run dev"
}
`
}

function generateVercelJson(): string {
  return `{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "devCommand": "npm run dev",
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30
    }
  }
}
`
}

function generateRailwayJson(): string {
  return `{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "healthcheckPath": "/",
    "restartPolicyType": "ON_FAILURE",
    "numReplicas": 1
  }
}
`
}

function generateRenderYaml(): string {
  return `services:
  - type: web
    name: my-speexjs-app
    env: node
    buildCommand: npm run build
    startCommand: node dist/index.js
    healthCheckPath: /
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
`
}

function generateFlyToml(): string {
  return `app = "my-speexjs-app"
primary_region = "iad"

[build]
  command = "npm run build"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
`
}

function printDeployInstructions(target: string): void {
  console.log()
  console.log(`  ${colors.bold(`Deploy instructions for ${target}:`)}`)
  console.log()

  if (target === 'docker') {
    console.log(`  ${colors.cyan('1.')} Build and start containers:`)
    console.log(`     ${colors.dim('docker compose up -d --build')}`)
    console.log()
    console.log(`  ${colors.cyan('2.')} Check container status:`)
    console.log(`     ${colors.dim('docker compose ps')}`)
    console.log()
    console.log(`  ${colors.cyan('3.')} View logs:`)
    console.log(`     ${colors.dim('docker compose logs -f app')}`)
    console.log()
    console.log(`  ${colors.cyan('4.')} Stop containers:`)
    console.log(`     ${colors.dim('docker compose down')}`)
    console.log()
    console.log(`  ${colors.bold('Deploy to production:')}`)
    console.log(`  ${colors.dim('Push your Docker image to a registry (Docker Hub, GitHub Container Registry, etc.)')}`)
    console.log(`  ${colors.dim('and deploy to your server via SSH or a platform like Railway, Fly.io, or AWS ECS.')}`)
  } else if (target === 'vercel') {
    console.log(`  ${colors.cyan('1.')} Install Vercel CLI:`)
    console.log(`     ${colors.dim('npm i -g vercel')}`)
    console.log()
    console.log(`  ${colors.cyan('2.')} Deploy:`)
    console.log(`     ${colors.dim('vercel --prod')}`)
    console.log()
    console.log(`  ${colors.cyan('3.')} For subsequent deployments:`)
    console.log(`     ${colors.dim('vercel --prod')}`)
    console.log()
    console.log(`  ${colors.bold('Environment variables:')}`)
    console.log(`  ${colors.dim('Set these in the Vercel dashboard or use vercel env add:')}`)
    console.log(`     ${colors.dim('NODE_ENV=production')}`)
    console.log(`     ${colors.dim('DATABASE_URL=...')}`)
    console.log(`     ${colors.dim('APP_KEY=...')}`)
  } else if (target === 'railway') {
    console.log(`  ${colors.cyan('1.')} Install Railway CLI:`)
    console.log(`     ${colors.dim('npm i -g @railway/cli')}`)
    console.log()
    console.log(`  ${colors.cyan('2.')} Login:`)
    console.log(`     ${colors.dim('railway login')}`)
    console.log()
    console.log(`  ${colors.cyan('3.')} Initialize project:`)
    console.log(`     ${colors.dim('railway init')}`)
    console.log()
    console.log(`  ${colors.cyan('4.')} Deploy:`)
    console.log(`     ${colors.dim('railway up')}`)
    console.log()
    console.log(`  ${colors.cyan('5.')} Set environment variables:`)
    console.log(`     ${colors.dim('railway variables set NODE_ENV=production')}`)
    console.log(`     ${colors.dim('railway variables set DATABASE_URL=...')}`)
    console.log()
    console.log(`  ${colors.bold('Dashboard:')}`)
    console.log(`  ${colors.dim('https://railway.app/dashboard')}`)
  } else if (target === 'render') {
    console.log(`  ${colors.cyan('1.')} Push your code to a Git repository (GitHub, GitLab)`)
    console.log()
    console.log(`  ${colors.cyan('2.')} Go to ${colors.dim('https://dashboard.render.com')}`)
    console.log(`     ${colors.dim('Click "New +" → "Web Service"')}`)
    console.log()
    console.log(`  ${colors.cyan('3.')} Connect your repository`)
    console.log()
    console.log(`  ${colors.cyan('4.')} Render auto-detects the config from render.yaml`)
    console.log(`     ${colors.dim('Or manually set:')}`)
    console.log(`     ${colors.dim('  Build Command: npm run build')}`)
    console.log(`     ${colors.dim('  Start Command: node dist/index.js')}`)
    console.log()
    console.log(`  ${colors.cyan('5.')} Add environment variables in the Render dashboard`)
    console.log()
    console.log(`  ${colors.bold('Manual deploy:')}`)
    console.log(`  ${colors.dim('Trigger deploys from the Render dashboard or push to your branch.')}`)
  } else if (target === 'flyio') {
    console.log(`  ${colors.cyan('1.')} Install flyctl:`)
    console.log(`     ${colors.dim('Windows: powershell -Command "iwr https://fly.io/install.ps1 -UseBasicParsing | iex"')}`)
    console.log(`     ${colors.dim('macOS/Linux: curl -L https://fly.io/install.sh | sh')}`)
    console.log()
    console.log(`  ${colors.cyan('2.')} Login:`)
    console.log(`     ${colors.dim('fly auth login')}`)
    console.log()
    console.log(`  ${colors.cyan('3.')} Launch the app:`)
    console.log(`     ${colors.dim('fly launch --generate-name')}`)
    console.log(`     ${colors.dim('(This creates fly.toml if not present)')}`)
    console.log()
    console.log(`  ${colors.cyan('4.')} Deploy:`)
    console.log(`     ${colors.dim('fly deploy')}`)
    console.log()
    console.log(`  ${colors.cyan('5.')} Set secrets:`)
    console.log(`     ${colors.dim('fly secrets set NODE_ENV=production DATABASE_URL=...')}`)
    console.log()
    console.log(`  ${colors.cyan('6.')} Scale memory (optional):`)
    console.log(`     ${colors.dim('fly scale memory 512')}`)
    console.log()
    console.log(`  ${colors.bold('Open the app:')}`)
    console.log(`  ${colors.dim('fly apps open')}`)
  }

  console.log()
}

export async function deploy(options?: Partial<DeployOptions>): Promise<void> {
  const opts: DeployOptions = {
    docker: options?.docker ?? false,
    vercel: options?.vercel ?? false,
    railway: options?.railway ?? false,
    render: options?.render ?? false,
    flyio: options?.flyio ?? false,
    init: options?.init ?? false,
  }

  let target = ''

  for (const t of TARGETS) {
    if (opts[t]) {
      target = t
      break
    }
  }

  if (!target) {
    console.log(`  ${colors.cyan('?')} Select deployment target:`)
    TARGETS.forEach((t, i) => {
      console.log(`  ${colors.dim(`${i + 1})`)} ${t.charAt(0).toUpperCase() + t.slice(1)}`)
    })
    console.log()
    process.stdout.write(`  ${colors.cyan('→')} Enter number (1-${TARGETS.length}): `)

    target = await new Promise<string>((resolve) => {
      process.stdin.once('data', (data) => {
        const input = data.toString().trim()
        const idx = Number.parseInt(input, 10) - 1
        if (idx >= 0 && idx < TARGETS.length) {
          resolve(TARGETS[idx]!)
        } else {
          console.log(`  ${colors.red('Invalid choice, defaulting to Docker')}`)
          resolve('docker')
        }
      })
    })
  }

  const baseDir = resolve(process.cwd())

  if (target === 'docker') {
    console.log(`  ${colors.cyan('→')} Generating Docker configuration...`)

    const dockerfilePath = resolve(baseDir, 'Dockerfile')
    if (!existsSync(dockerfilePath) || opts.init) {
      writeFileSync(dockerfilePath, generateDockerfile(), 'utf-8')
      console.log(`  ${colors.green('✅')} Dockerfile created`)
    } else {
      console.log(`  ${colors.yellow('⚠')} Dockerfile already exists — use --init to overwrite`)
    }

    const composePath = resolve(baseDir, 'docker-compose.yml')
    if (!existsSync(composePath) || opts.init) {
      writeFileSync(composePath, generateDockerCompose(), 'utf-8')
      console.log(`  ${colors.green('✅')} docker-compose.yml created`)
    } else {
      console.log(`  ${colors.yellow('⚠')} docker-compose.yml already exists — use --init to overwrite`)
    }

    const dockerignorePath = resolve(baseDir, '.dockerignore')
    if (!existsSync(dockerignorePath) || opts.init) {
      writeFileSync(dockerignorePath, generateDockerignore(), 'utf-8')
      console.log(`  ${colors.green('✅')} .dockerignore created`)
    } else {
      console.log(`  ${colors.yellow('⚠')} .dockerignore already exists — use --init to overwrite`)
    }

    if (!opts.init) printDeployInstructions('docker')
    console.log(`  ${colors.green('✓')} Docker setup complete`)
  }

  if (target === 'vercel') {
    console.log(`  ${colors.cyan('→')} Generating Vercel configuration...`)

    const vercelProjectPath = resolve(baseDir, 'project.json')
    const vercelJsonPath = resolve(baseDir, 'vercel.json')

    if (!existsSync(vercelJsonPath) || opts.init) {
      writeFileSync(vercelJsonPath, generateVercelJson(), 'utf-8')
      console.log(`  ${colors.green('✅')} vercel.json created`)
    } else {
      console.log(`  ${colors.yellow('⚠')} vercel.json already exists — use --init to overwrite`)
    }

    if (!existsSync(vercelProjectPath)) {
      writeFileSync(vercelProjectPath, generateVercelProject(), 'utf-8')
    }

    if (!opts.init) printDeployInstructions('vercel')
    console.log(`  ${colors.green('✓')} Vercel setup complete`)
  }

  if (target === 'railway') {
    console.log(`  ${colors.cyan('→')} Generating Railway configuration...`)

    const railwayPath = resolve(baseDir, 'railway.json')
    if (!existsSync(railwayPath) || opts.init) {
      writeFileSync(railwayPath, generateRailwayJson(), 'utf-8')
      console.log(`  ${colors.green('✅')} railway.json created`)
    } else {
      console.log(`  ${colors.yellow('⚠')} railway.json already exists — use --init to overwrite`)
    }

    if (!opts.init) printDeployInstructions('railway')
    console.log(`  ${colors.green('✓')} Railway setup complete`)
  }

  if (target === 'render') {
    console.log(`  ${colors.cyan('→')} Generating Render configuration...`)

    const renderPath = resolve(baseDir, 'render.yaml')
    if (!existsSync(renderPath) || opts.init) {
      writeFileSync(renderPath, generateRenderYaml(), 'utf-8')
      console.log(`  ${colors.green('✅')} render.yaml created`)
    } else {
      console.log(`  ${colors.yellow('⚠')} render.yaml already exists — use --init to overwrite`)
    }

    if (!opts.init) printDeployInstructions('render')
    console.log(`  ${colors.green('✓')} Render setup complete`)
  }

  if (target === 'flyio') {
    console.log(`  ${colors.cyan('→')} Generating Fly.io configuration...`)

    const flyPath = resolve(baseDir, 'fly.toml')
    if (!existsSync(flyPath) || opts.init) {
      writeFileSync(flyPath, generateFlyToml(), 'utf-8')
      console.log(`  ${colors.green('✅')} fly.toml created`)
    } else {
      console.log(`  ${colors.yellow('⚠')} fly.toml already exists — use --init to overwrite`)
    }

    if (!opts.init) printDeployInstructions('flyio')
    console.log(`  ${colors.green('✓')} Fly.io setup complete`)
  }
}
