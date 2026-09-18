import type {AgentWorkspace} from "./workspace";
export type CodingTool={id:string;description:string;execute(input:Record<string,unknown>):Promise<unknown>};
export function createCodingToolbox(workspace:AgentWorkspace):CodingTool[]{return[
{id:"read_file",description:"Read one repository file.",execute:async input=>workspace.read(String(input.path||""))},
{id:"read_files",description:"Read multiple repository files.",execute:async input=>workspace.readMany(Array.isArray(input.paths)?input.paths.map(String):[])},
{id:"file_exists",description:"Check whether a repository file exists.",execute:async input=>workspace.exists(String(input.path||""))},
{id:"list_files",description:"List repository files under a prefix.",execute:async input=>workspace.list(String(input.prefix||""))},
];}
export function toolboxManifest(tools:CodingTool[]){return tools.map(({id,description})=>({id,description}));}