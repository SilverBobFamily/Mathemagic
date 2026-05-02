import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  endTurn,
  passTurn,
  playCreature,
  playModifier,
  playEvent,
  isGameOver,
  getWinner,
} from '@/lib/GameEngine';
import { createSupabaseServiceClient } from '@/lib/supabase-service';
import type { GameState, Side } from '@/lib/types';

type MoveBody =
  | { type: 'playCreature'; cardId: number; targetSide?: Side }
  | { type: 'playModifier'; cardId: number; targetCreatureId: number; targetSide: Side }
  | { type: 'playEvent'; cardId: number; targetCreatureId: number; targetSide: Side; secondTargetId?: number; secondTargetSide?: Side }
  | { type: 'endTurn' }
  | { type: 'passTurn' }
  | { type: 'setState'; stateJson: GameState };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select('id, player1_id, player2_id, state_json, active_side, status')
    .eq('id', id)
    .single();

  if (fetchError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  if (game.status === 'finished') {
    return NextResponse.json({ error: 'Game is already finished' }, { status: 409 });
  }

  const callerSide =
    game.player1_id === user.id
      ? 'player'
      : game.player2_id === user.id
      ? 'opponent'
      : null;

  if (!callerSide) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (game.active_side !== callerSide) {
    return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
  }

  const body: MoveBody = await request.json();
  const currentState: GameState = game.state_json as GameState;

  let nextState: GameState;
  switch (body.type) {
    case 'playCreature':
      nextState = playCreature(currentState, body.cardId, body.targetSide ?? callerSide as Side);
      if (nextState === currentState) {
        return NextResponse.json({ error: 'Invalid move' }, { status: 422 });
      }
      break;
    case 'playModifier':
      nextState = playModifier(currentState, body.cardId, body.targetCreatureId, body.targetSide);
      if (nextState === currentState) {
        return NextResponse.json({ error: 'Invalid move' }, { status: 422 });
      }
      break;
    case 'playEvent':
      nextState = playEvent(currentState, body.cardId, body.targetCreatureId, body.targetSide, body.secondTargetId, body.secondTargetSide);
      if (nextState === currentState) {
        return NextResponse.json({ error: 'Invalid move' }, { status: 422 });
      }
      break;
    case 'endTurn':
      nextState = endTurn(currentState);
      break;
    case 'passTurn':
      nextState = passTurn(currentState);
      break;
    case 'setState':
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Invalid move type' }, { status: 400 });
      }
      nextState = body.stateJson;
      break;
    default:
      return NextResponse.json({ error: 'Invalid move type' }, { status: 400 });
  }

  const newStatus = isGameOver(nextState) ? 'finished' : game.status;

  const { error: updateError } = await supabase
    .from('games')
    .update({
      state_json: nextState,
      active_side: nextState.turn,
      status: newStatus,
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Award coins/stats when game just finished
  if (newStatus === 'finished' && game.status !== 'finished' && game.player1_id && game.player2_id) {
    const serviceClient = createSupabaseServiceClient();
    const winner = getWinner(nextState);
    let awardError: { message: string } | null = null;
    if (winner === 'player') {
      ({ error: awardError } = await serviceClient.rpc('award_win', {
        p_winner_id: game.player1_id,
        p_loser_id: game.player2_id,
      }));
    } else if (winner === 'opponent') {
      ({ error: awardError } = await serviceClient.rpc('award_win', {
        p_winner_id: game.player2_id,
        p_loser_id: game.player1_id,
      }));
    } else {
      ({ error: awardError } = await serviceClient.rpc('award_tie', {
        p_player1_id: game.player1_id,
        p_player2_id: game.player2_id,
      }));
    }
    if (awardError) {
      console.error('[coin-award] failed for game', id, awardError.message);
    }
  }

  return NextResponse.json({ state: nextState });
}
