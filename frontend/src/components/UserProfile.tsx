import { UserButton } from '@clerk/clerk-react';

export const UserProfile = () => {
  return (
    <div className="flex items-center gap-3">
      <UserButton
        appearance={{
          elements: {
            userButtonAvatarBox: 'w-10 h-10',
            userButtonPopoverCard: 'fluent-layer-3 border border-border rounded-lg fluent-shadow-lg',
            userButtonPopoverActions: 'fluent-layer-3',
          },
        }}
        showName
      />
    </div>
  );
};
