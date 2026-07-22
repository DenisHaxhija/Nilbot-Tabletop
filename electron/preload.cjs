// Bridge between the game screens (title/campaigns) and the shell.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tabletop', {
	listCampaigns: () => ipcRenderer.invoke('campaigns:list'),
	createCampaign: (name) => ipcRenderer.invoke('campaigns:create', name),
	openCampaign: (id) => ipcRenderer.invoke('campaigns:open', id),
	removeCampaign: (id) => ipcRenderer.invoke('campaigns:remove', id),
	discoverTables: () => ipcRenderer.invoke('tables:discover'),
	joinTable: (address, code) => ipcRenderer.invoke('tables:join', address, code),
	listTables: () => ipcRenderer.invoke('tables:list'),
	openTable: (id) => ipcRenderer.invoke('tables:open', id),
	forgetTable: (id) => ipcRenderer.invoke('tables:forget', id),
	settingsInfo: () => ipcRenderer.invoke('settings:info'),
	toggleFullscreen: () => ipcRenderer.invoke('settings:fullscreen'),
	openDataFolder: () => ipcRenderer.invoke('settings:open-data')
});
