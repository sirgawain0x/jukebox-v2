"use client";
import ProtectedFeature from '../auth/ProtectedFeature';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export default function ProtectedExample() {
  return (
    <div className="bg-white/50 rounded-lg p-4 space-y-4">
      <h3 className="font-semibold">Protected Feature Example</h3>
      
      <ProtectedFeature
        fallback={
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-700 text-sm">
              This is a custom fallback for the protected feature
            </p>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-green-600">
            <Icon name="check" size="sm" />
            <span className="text-sm">You are authenticated!</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert('This feature is only available to authenticated users!')}
          >
            <Icon name="star" size="sm" className="mr-1" />
            Premium Feature
          </Button>
        </div>
      </ProtectedFeature>
    </div>
  );
}
