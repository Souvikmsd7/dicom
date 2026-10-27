import { useState } from 'react';
import { Layout } from './components/Layout';
import { ImagingPage } from './pages/ImagingPage';
import { DeviceManagementPage } from './pages/DeviceManagementPage';

export function App() {
  const [activeTab, setActiveTab] = useState<'imaging' | 'devices'>('imaging');

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'imaging' ? <ImagingPage /> : <DeviceManagementPage />}
    </Layout>
  );
}

export default App;
