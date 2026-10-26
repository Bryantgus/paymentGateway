import { createApp } from './app';
import { buildDependencies } from './composition-root';
import { loadEnv } from './config/env';

let env;
try {
  env = loadEnv();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

createApp(buildDependencies(env)).listen(env.port, () => {
  console.log(`Server ready at http://localhost:${env.port}`);
});
