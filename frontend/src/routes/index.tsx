import { createFileRoute } from '@tanstack/react-router';

const LandingPage = () => {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: 'purple', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      color: 'white',
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
          🎉 LANDING PAGE WORKS! 🎉
        </h1>
        <p>Router is working correctly!</p>
        <p>Time: {new Date().toLocaleTimeString()}</p>
        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '10px' }}>
          <p>✅ React: Working</p>
          <p>✅ TanStack Router: Working</p>
          <p>✅ Landing Page Route: Working</p>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/')({
  component: LandingPage,
});
