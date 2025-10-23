import { createFileRoute } from '@tanstack/react-router';

const SettingsComponent = () => {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="fluent-title text-3xl text-foreground mb-2">Settings</h1>
        <p className="fluent-body text-muted-foreground">
          Configure your preferences and account settings
        </p>
      </div>

      {/* Settings Panel */}
      <div className="fluent-layer-2 p-8 rounded-xl fluent-reveal">
        <h3 className="fluent-subtitle text-xl text-foreground mb-6">Settings</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="fluent-body font-medium text-foreground">Theme</label>
            <p className="fluent-caption">Choose your preferred theme appearance</p>
          </div>
          <div className="space-y-2">
            <label className="fluent-body font-medium text-foreground">Video Quality</label>
            <p className="fluent-caption">Select the default quality for processed videos</p>
          </div>
          <div className="space-y-2">
            <label className="fluent-body font-medium text-foreground">Notifications</label>
            <p className="fluent-caption">Configure notification preferences</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsComponent,
});
