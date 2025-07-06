import { MiniKit } from "@worldcoin/minikit-js";

export interface SimpleSiweMessage {
  prepareMessage(): string;
  address: string;
  statement?: string;
  domain?: string;
  uri?: string;
  version?: string;
  chainId?: number;
  expirationTime?: string;
  notBefore?: string;
}

export interface TCWAuthSession {
  address: string;
  signature: string;
  message: string;
  tcwSession: any; // Replace with actual TCW session type
}

export class TCWAuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
    this.name = "TCWAuthError";
  }
}

/**
 * Get wallet address from MiniKit
 */
export const getWalletAddress = async (): Promise<string> => {
  try {
    if (!MiniKit.isInstalled()) {
      throw new TCWAuthError(
        "MiniKit is not installed",
        "MINIKIT_NOT_INSTALLED"
      );
    }

    const user = MiniKit.user;
    if (!user?.walletAddress) {
      throw new TCWAuthError(
        "No wallet address available from MiniKit",
        "NO_WALLET_ADDRESS"
      );
    }

    return user.walletAddress;
  } catch (error) {
    if (error instanceof TCWAuthError) {
      throw error;
    }
    throw new TCWAuthError(
      "Failed to get wallet address",
      "WALLET_ADDRESS_ERROR",
      error as Error
    );
  }
};

/**
 * Sign SIWE message using World/MiniKit
 */
export const signSiweWithWorld = async (
  message: string
): Promise<{ signature: string }> => {
  try {
    if (!MiniKit.isInstalled()) {
      throw new TCWAuthError(
        "MiniKit is not installed",
        "MINIKIT_NOT_INSTALLED"
      );
    }

    // Use MiniKit's wallet auth to sign the message
    const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
      nonce: crypto.randomUUID(),
      requestId: "tcw-auth",
      expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      notBefore: new Date(Date.now() - 60 * 1000),
      statement: message,
    });

    if (finalPayload.status === "error") {
      throw new TCWAuthError(
        "Failed to sign message with World",
        "WORLD_SIGN_ERROR"
      );
    }

    return { signature: finalPayload.signature };
  } catch (error) {
    if (error instanceof TCWAuthError) {
      throw error;
    }
    throw new TCWAuthError(
      "Failed to sign SIWE message with World",
      "WORLD_SIGN_ERROR",
      error as Error
    );
  }
};

/**
 * Initialize TCW session with signature
 */
export const initializeTCWSession = async (
  tcw: any,
  siweMessage: SimpleSiweMessage,
  signature: string
): Promise<TCWAuthSession> => {
  try {
    // Initialize the TCW session using the signature
    // TODO: Replace this with the actual TCW SDK method once available
    // const tcwSession = await tcw.initializeFromSignature({
    //   message: siweMessage.prepareMessage(),
    //   signature,
    //   address: siweMessage.address,
    // });

    // Placeholder session for now
    const tcwSession = {
      initialized: true,
      address: siweMessage.address,
      timestamp: Date.now(),
    };

    return {
      address: siweMessage.address,
      signature,
      message: siweMessage.prepareMessage(),
      tcwSession,
    };
  } catch (error) {
    throw new TCWAuthError(
      "Failed to initialize TCW session",
      "TCW_SESSION_INIT_ERROR",
      error as Error
    );
  }
};

/**
 * Generates a SIWE message using TCW SDK with World-specific parameters
 * @param tcw - TinyCloudWeb instance
 * @param address - Ethereum address performing the signing
 * @returns Promise<SimpleSiweMessage> - Generated SIWE message ready for signing
 */
export const generateSiweWithTCW = async (
  tcw: any,
  address: string
): Promise<SimpleSiweMessage> => {
  try {
    if (!tcw) {
      throw new TCWAuthError(
        "TCW instance is not available",
        "TCW_NOT_INITIALIZED"
      );
    }

    // Validate address format
    if (!address || !address.startsWith("0x") || address.length !== 42) {
      throw new TCWAuthError(
        "Invalid Ethereum address format",
        "INVALID_ADDRESS"
      );
    }

    // Ensure we're in browser environment for proper initialization
    if (typeof window === "undefined") {
      throw new TCWAuthError(
        "TCW authentication must be called in browser environment",
        "NOT_BROWSER_ENVIRONMENT"
      );
    }

    // Generate SIWE message with World-specific parameters using object format
    const randomId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);

    const siweMessageConfig = {
      statement: `Sign in to World Mini App with TinyCloud`,
      domain: window.location.host,
      uri: window.location.origin,
      version: "1",
      chainId: 1, // Ethereum mainnet
      expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      notBefore: new Date(Date.now() - 60 * 1000).toISOString(), // 1 minute ago
    };

    const siweMessage = await tcw.generateSiweMessage(
      address,
      siweMessageConfig
    );

    return siweMessage;
  } catch (error) {
    if (error instanceof TCWAuthError) {
      throw error;
    }
    throw new TCWAuthError(
      "Failed to generate SIWE message with TCW",
      "SIWE_GENERATION_ERROR",
      error as Error
    );
  }
};

/**
 * Complete TCW + World authentication flow
 * @param tcw - TinyCloudWeb instance
 * @returns Promise<TCWAuthSession> - Complete authentication session
 */
export const performTCWWorldAuth = async (
  tcw: any
): Promise<TCWAuthSession> => {
  try {
    // Ensure we're in browser environment
    if (typeof window === "undefined") {
      throw new TCWAuthError(
        "TCW + World authentication can only be performed in browser environment",
        "NOT_BROWSER_ENVIRONMENT"
      );
    }

    console.log("Starting TCW + World authentication flow...");

    // Step 1: Get wallet address from MiniKit
    const address = await getWalletAddress();
    console.log("Got wallet address:", address);

    // Step 2: Generate SIWE message with TCW capabilities
    const siweMessage = await generateSiweWithTCW(tcw, address);
    console.log("Generated SIWE message:", siweMessage);

    // Step 3: Sign the SIWE message with World/MiniKit
    const signResult = await signSiweWithWorld(siweMessage.prepareMessage());
    console.log("Got signature from World:", signResult.signature);

    // Step 4: Initialize TCW session with the signature
    const tcwSession = await initializeTCWSession(
      tcw,
      siweMessage,
      signResult.signature
    );
    console.log("TCW session initialized:", tcwSession);

    return tcwSession;
  } catch (error) {
    if (error instanceof TCWAuthError) {
      throw error;
    }
    throw new TCWAuthError(
      "TCW + World authentication flow failed",
      "AUTH_FLOW_ERROR",
      error as Error
    );
  }
};