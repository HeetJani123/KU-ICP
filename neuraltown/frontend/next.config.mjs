import fs from 'node:fs'
import path from 'node:path'

const rootEnvPath = path.resolve(process.cwd(), '../.env')

if (fs.existsSync(rootEnvPath)) {
  const envLines = fs.readFileSync(rootEnvPath, 'utf8').split(/\r?\n/)
  for (const line of envLines) {
    if (!line || line.trim().startsWith('#')) continue
    const [key, ...rest] = line.split('=')
    if (!key) continue
    const value = rest.join('=').trim()
    if (value && typeof process.env[key] === 'undefined') {
      process.env[key] = value
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

export default nextConfig
