/** Which app this build is: the passenger app «بدربي», or the partner app «كابتن بدربي» (captains, offices and admin). */
export const APP: 'passenger' | 'partner' = import.meta.env.VITE_APP === 'partner' ? 'partner' : 'passenger';
export const IS_PARTNER = APP === 'partner';

/** The admin signs in to the partner app with this number. */
export const ADMIN_PHONE = '7111111111';
