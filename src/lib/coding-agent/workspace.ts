export type WorkspaceFile={path:string;content:string};
export interface AgentWorkspace{read(path:string):Promise<WorkspaceFile>;readMany(paths:string[]):Promise<WorkspaceFile[]>;exists(path:string):Promise<boolean>;write(path:string,content:string):Promise<void>;list(prefix?:string):Promise<string[]>;}
export class GitHubWorkspace implements AgentWorkspace{
constructor(private readonly repo:string,private readonly ref:string,private readonly token:string){}
private async request<T>(path:string,init?:RequestInit):Promise<T>{const response=await fetch(`https://api.github.com/repos/${this.repo}${path}`,{...init,headers:{Accept:"application/vnd.github+json",Authorization:`Bearer ${this.token}`,"X-GitHub-Api-Version":"2022-11-28",...(init?.headers||{})},cache:"no-store"});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(typeof data?.message==="string"?data.message:`GitHub API ${response.status}`);return data as T;}
async read(path:string){const data=await this.request<{type?:string;content?:string;encoding?:string}>(`/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(this.ref)}`);if(data.type!=="file"||!data.content)throw new Error(`File not found: ${path}`);return{path,content:Buffer.from(data.content.replace(/\\n/g,""),data.encoding==="base64"?"base64":"utf8").toString("utf8")};}
async readMany(paths:string[]){return Promise.all(paths.slice(0,30).map(async p=>{try{return await this.read(p)}catch{return{path:p,content:"[FILE_NOT_FOUND]"}}}));}
async exists(path:string){try{await this.read(path);return true}catch{return false}}
async write(){throw new Error("GitHubWorkspace is read-only; repository writes stay behind review/PR.")}
async list(prefix=""){const data=await this.request<Array<{type:string;path:string}>>(`/git/trees/${encodeURIComponent(this.ref)}?recursive=1`);return data.filter(x=>x.type==="blob"&&x.path.startsWith(prefix)).map(x=>x.path);}
}