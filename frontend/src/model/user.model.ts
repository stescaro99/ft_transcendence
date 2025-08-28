import { Stats } from './stats.model';

export class User {
	id: number| null = null;
	name: string = '';
	nickname: string = '';
	email: string = '';
	password: string = '';
	surname: string = ''; 
	language: string = '';
	image_url: string = '';
	stats: Stats = {}
	friends?: string[];
	fr_request?: string[];
	online?: boolean;
	tfa_code?: string | null = null;
}