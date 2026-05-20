import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envText = readFileSync('.env', 'utf-8');
const envConfig = Object.fromEntries(
  envText.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('=').map(part => part.trim()))
    .filter(parts => parts.length >= 2)
    .map(([key, ...rest]) => [key, rest.join('=').replace(/^"|"$/g, '').replace(/^'|'$/g, '')])
);

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- Account Types ---');
  const { data: types, error: err1 } = await supabase.from('accounts').select('type');
  if (err1) {
      console.error(err1);
  } else {
      const distinctTypes = [...new Set(types.map(t => t.type))];
      console.log(distinctTypes);
  }

  console.log('--- Negative Balances ---');
  const { data: negs, error: err2 } = await supabase.from('accounts').select('id, name, type, balance').lt('balance', 0);
  if (err2) {
      console.error(err2);
  } else {
      console.log(negs);
  }
}

check();
