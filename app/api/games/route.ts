import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { GameState } from '@/lib/types';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: { stateJson: GameState } = await request.json();
  const { stateJson } = body;

  const { data, error } = await supabase
    .from('games')
    .insert({
      player1_id: user.id,
      state_json: stateJson,
      active_side: stateJson.turn,
      status: 'waiting',
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('games')
    .select('id, status, active_side, player1_id, player2_id, created_at')
    .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
    .neq('status', 'finished');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ games: data });
}
