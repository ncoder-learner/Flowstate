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

const SPLIT_KEY='flowstate-trial-splits-v1';
export function loadTrialSplits():number[]{
 try{const value=JSON.parse(localStorage.getItem(SPLIT_KEY)||'[]');return Array.isArray(value)?value.filter((n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>0).slice(0,3):[];}catch{return [];}
}
export function saveTrialSplits(splits:number[]):number[]{
 const previous=loadTrialSplits(),next=[0,1,2].map(i=>{const current=splits[i],best=previous[i];return typeof current==='number'&&current>0?(typeof best==='number'&&best>0?Math.min(best,current):current):(best||0);});
 try{localStorage.setItem(SPLIT_KEY,JSON.stringify(next));}catch{}
 return next;
}
