import { randomInt, randomUUID } from 'node:crypto';
import type {
  ActivityMode,
  ActivityStage,
  ActivityView,
} from '../../../shared/protocol.js';
import { memorySymbols } from '../../../shared/investigation.js';
import { gameConfig } from './gameConfig.js';

export interface ActivitySettings {
  choiceTime: number;
  memorizeTime: number;
  answerTime: number;
  helpLength: number;
  sabotageLength: number;
}
export const defaultActivitySettings: ActivitySettings = {
  choiceTime: gameConfig.ACTIVITY_CHOICE_TIME,
  memorizeTime: gameConfig.ACTIVITY_MEMORIZE_TIME,
  answerTime: gameConfig.ACTIVITY_ANSWER_TIME,
  helpLength: gameConfig.HELP_SEQUENCE_LENGTH,
  sabotageLength: gameConfig.SABOTAGE_SEQUENCE_LENGTH,
};
export interface Activity {
  id: string;
  mode: ActivityMode | null;
  stage: ActivityStage;
  sequence: number[];
  choiceDeadline: number;
  revealUntil: number;
  answerDeadline: number;
  contribution: number | null;
  failedSabotage: boolean;
}
export function createActivity(
  now: number,
  settings: ActivitySettings,
): Activity {
  return {
    id: randomUUID(),
    mode: null,
    stage: 'choice',
    sequence: [],
    choiceDeadline: now + settings.choiceTime,
    revealUntil: 0,
    answerDeadline: 0,
    contribution: null,
    failedSabotage: false,
  };
}
export function beginActivity(
  activity: Activity,
  mode: ActivityMode,
  now: number,
  settings: ActivitySettings,
) {
  activity.mode = mode;
  activity.sequence = Array.from(
    { length: mode === 'help' ? settings.helpLength : settings.sabotageLength },
    () => randomInt(memorySymbols.length),
  );
  activity.stage = 'memorize';
  activity.revealUntil = now + settings.memorizeTime;
  activity.answerDeadline = activity.revealUntil + settings.answerTime;
}
export function completeActivity(activity: Activity, correct: boolean) {
  activity.contribution = correct
    ? activity.mode === 'sabotage'
      ? gameConfig.SABOTAGE_POINTS
      : gameConfig.HELP_POINTS
    : gameConfig.MINIMUM_POINTS;
  activity.failedSabotage = activity.mode === 'sabotage' && !correct;
  activity.stage = 'done';
}
export function advanceActivity(activity: Activity, now: number): boolean {
  const before = activity.stage;
  if (activity.stage === 'choice' && now >= activity.choiceDeadline)
    completeActivity(activity, false);
  if (activity.stage === 'memorize' && now >= activity.revealUntil)
    activity.stage = 'answer';
  if (activity.stage === 'answer' && now >= activity.answerDeadline)
    completeActivity(activity, false);
  return before !== activity.stage;
}
export function activityView(activity: Activity, now: number): ActivityView {
  return {
    id: activity.id,
    stage: activity.stage,
    mode: activity.mode,
    // Enforce visibility even if an unrelated broadcast precedes the next timer tick.
    sequence:
      activity.stage === 'memorize' && now < activity.revealUntil
        ? [...activity.sequence]
        : null,
    length: activity.sequence.length,
    deadlineAt:
      activity.stage === 'choice'
        ? activity.choiceDeadline
        : activity.stage === 'memorize'
          ? activity.revealUntil
          : activity.answerDeadline,
    serverNow: now,
  };
}
