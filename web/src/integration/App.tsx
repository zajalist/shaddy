import { useState } from 'react';
import { AppShell } from '../ux';
import type { RendererAPI } from '../renderer';

function App() {
  const [source, setSource] = useState('void main() {}');

  // Dummy mock for now
  const mockRenderer = {} as RendererAPI;

  const handlePhotoMatch = async (file: File, templateId: string) => {
    console.log("Photo match requested", file, templateId);
  };

  return (
    <AppShell
      renderer={mockRenderer}
      editorSource={source}
      onEditorSourceChange={setSource}
      errors={[]}
      onPhotoMatch={handlePhotoMatch}
    />
  );
}

export default App;
