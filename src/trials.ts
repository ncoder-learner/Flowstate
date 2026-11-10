const STORAGE_KEY='flowstate-trial-record-v1';
export type TrialMedal='PLATINUM'|'GOLD'|'SILVER'|'BRONZE'|'UNRANKED';
export const TRIAL_CHECKPOINTS=[-9,-35,-61] as const;
export const TRIAL_FINISH_Z=-85;
export const TRIAL_MEDALS={platinum:24,gold:30,silver:40,bronze:55} as const;

export function getTrialMedal(seconds:number):TrialMedal{
 if(seconds<=TRIAL_MEDALS.platinum)return 'PLATINUM';
 if(seconds<=TRIAL_MEDALS.gold)return 'GOLD';
 if(seconds<=TRIAL_MEDALS.silver)return 'SILVER';
 if(seconds<=TRIAL_MEDALS.bronze)return 'BRONZE';
 return 'UNRANKED';
}

export function loadTrialBest():number{
 try{const value=Number(localStorage.getItem(STORAGE_KEY));return Number.isFinite(value)&&value>0?value:0;}catch{return 0;}
}

export function saveTrialTime(seconds:number):number{
 const current=loadTrialBest(),best=current>0?Math.min(current,seconds):seconds;
 try{localStorage.setItem(STORAGE_KEY,String(best));}catch{}
 return best;
}
