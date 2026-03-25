// config for Supabase client and helper functions for database operations
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://wcosbonzozrdzwgdrbgi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjb3Nib256b3pyZHp3Z2RyYmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTIzODUsImV4cCI6MjA4OTgyODM4NX0.JJe2mOYlAR1SFElqqpr6SAgbd-coQJI46xym7LT4mQY';

// client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================
// INSERT SCORE
// =========================================
export async function insertScore({ game_id, player_name, score, time }) {
const { data, error } = await supabase
.from('scores')
.insert([
{
game_id,
player_name,
score,
time
}
])
.select(); // 🔥 สำคัญ

if (error) {
console.error('Insert error:', error);
return { success: false, error };
}

return { success: true, data };
}

// =========================================
// GET LEADERBOARD
// =========================================
export async function getLeaderboard(game_id) {
const { data, error } = await supabase
.from('scores')
.select('*')
.eq('game_id', game_id)
.order('score', { ascending: false })
.limit(10);

if (error) {
console.error('Fetch error:', error);
return [];
}

return data;
}

// =========================================
// CHECK PLAYER NAME
// =========================================
export async function checkPlayerNameExist(game_id, player_name) {
	const { data, error } = await supabase
		.from('scores')
		.select('id')
		.eq('game_id', game_id)
		.eq('player_name', player_name)
		.limit(1);

	if (error) {
		console.error('Check player name error:', error);
		return false;
	}

	return Array.isArray(data) && data.length > 0;
}

// =========================================
// REALTIME
// =========================================
export function subscribeLeaderboard(game_id, callback) {
return supabase
.channel('scores-channel')
.on(
'postgres_changes',
{
event: 'INSERT',
schema: 'public',
table: 'scores'
},
(payload) => {
if (payload.new.game_id === game_id) {
callback(payload.new);
}
}
)
.subscribe();
}
