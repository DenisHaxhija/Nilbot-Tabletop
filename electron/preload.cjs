// Bridge between the game screens (title/campaigns) and the shell.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tabletop', {
	listCampaigns: () => ipcRenderer.invoke('campaigns:list'),
	createCampaign: (name) => ipcRenderer.invoke('campaigns:create', name),
	openCampaign: (id) => ipcRenderer.invoke('campaigns:open', id),
	removeCampaign: (id) => ipcRenderer.invoke('campaigns:remove', id),
	settingsInfo: () => ipcRenderer.invoke('settings:info'),
	toggleFullscreen: () => ipcRenderer.invoke('settings:fullscreen'),
	openDataFolder: () => ipcRenderer.invoke('settings:open-data')
});
