import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

// Auto-generate version.json on every build for cache-busting in Fully Kiosk Browser
const generateVersionPlugin = () => ({
  name: 'generate-version',
  buildStart() {
    const version = {
      version: Date.now().toString(),
      buildTime: new Date().toISOString()
    };
    writeFileSync(
      resolve(process.cwd(), 'public/version.json'),
      JSON.stringify(version, null, 2)
    );
    console.log(`[version] Generated version: ${version.version}`);
  }
});

export default defineConfig({
  plugins: [react(), generateVersionPlugin()],
})
