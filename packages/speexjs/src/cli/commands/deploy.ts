import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'

interface DeployOptions {
  docker?: boolean
  vercel?: boolean
  init?: boolean
}

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
  }

  console.log()
}

export async function deploy(options?: Partial<DeployOptions>): Promise<void> {
  const opts: DeployOptions = {
    docker: options?.docker ?? false,
    vercel: options?.vercel ?? false,
    init: options?.init ?? false,
  }

  let target = ''

  if (opts.docker) {
    target = 'docker'
  } else if (opts.vercel) {
    target = 'vercel'
  } else {
    console.log(`  ${colors.cyan('?')} Select deployment target:`)
    console.log(`  ${colors.dim('1)')} Docker`)
    console.log(`  ${colors.dim('2)')} Vercel`)
    console.log()
    process.stdout.write(`  ${colors.cyan('→')} Enter number (1-2): `)

    target = await new Promise<string>((resolve) => {
      process.stdin.once('data', (data) => {
        const input = data.toString().trim()
        if (input === '1' || input === '2') {
          resolve(input === '1' ? 'docker' : 'vercel')
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

    if (!opts.init) {
      printDeployInstructions('docker')
    }

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

    if (!opts.init) {
      printDeployInstructions('vercel')
    }

    console.log(`  ${colors.green('✓')} Vercel setup complete`)
  }
}
