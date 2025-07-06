"use client";
import { useState, useEffect } from "react";
import { Button } from "@worldcoin/mini-apps-ui-kit-react";
import { performTCWWorldAuth, TCWAuthSession, TCWAuthError } from "@/lib/tcw-auth";

type User = {
  walletAddress?: string;
  username?: string;
  profilePictureUrl?: string;
};

export const TinyCloudAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tcw, setTcw] = useState<any | null>(null);
  const [tcwSession, setTcwSession] = useState<TCWAuthSession | null>(null);

  // Initialize TinyCloud Web SDK
  useEffect(() => {
    const initTCW = async () => {
      try {
        const { TinyCloudWeb } = await import("@tinycloudlabs/web-sdk");
        const tcwInstance = new TinyCloudWeb({
          // Add your configuration here
          // You may need to configure this based on your TCW setup
        });
        setTcw(tcwInstance);
      } catch (error) {
        console.error("Failed to initialize TinyCloud Web SDK:", error);
        setError("Failed to initialize TinyCloud Web SDK");
      }
    };

    initTCW();
  }, []);

  const handleTinyCloudAuth = async () => {
    if (!tcw) {
      setError("TinyCloud Web SDK not initialized");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Perform the complete TCW + World authentication flow
      const authSession = await performTCWWorldAuth(tcw);
      
      // Set the TCW session
      setTcwSession(authSession);
      
      // For display purposes, create a user object
      // In a real app, you might want to fetch additional user data from your backend
      setUser({
        walletAddress: authSession.address,
        username: undefined,
        profilePictureUrl: undefined,
      });

      console.log("TinyCloud authentication successful:", authSession);
    } catch (error) {
      console.error("TinyCloud authentication failed:", error);
      
      if (error instanceof TCWAuthError) {
        setError(`Authentication failed: ${error.message}`);
      } else {
        setError("Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    setUser(null);
    setTcwSession(null);
    setError(null);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {error && (
        <div className="text-red-600 text-sm font-medium text-center">
          {error}
        </div>
      )}
      
      {!user ? (
        <Button 
          onClick={handleTinyCloudAuth} 
          disabled={loading || !tcw}
          className="w-full"
        >
          {loading 
            ? "Connecting..." 
            : !tcw 
            ? "Initializing..." 
            : "Sign in with TinyCloud"
          }
        </Button>
      ) : (
        <div className="flex flex-col items-center space-y-3">
          <div className="text-green-600 font-medium">✓ Connected to TinyCloud</div>
          
          <div className="flex items-center space-x-2">
            {user?.profilePictureUrl && (
              <img
                src={user.profilePictureUrl}
                alt="Profile"
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="font-medium">
              {user?.username || 
               (user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'No Address')
              }
            </span>
          </div>
          
          {tcwSession && (
            <div className="text-xs text-gray-600 text-center">
              <div>Session Active</div>
              <div className="font-mono">
                {tcwSession.signature.slice(0, 10)}...
              </div>
            </div>
          )}
          
          <Button
            onClick={handleSignOut}
            variant="secondary"
            size="md"
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      )}
    </div>
  );
};