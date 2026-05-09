const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data, error } = await supabase.from('gym_classes').insert([{
    title: 'Test',
    start_time: new Date().toISOString(),
    end_time: new Date().toISOString(),
    instructor_id: null
  }]);
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
