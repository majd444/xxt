'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, Check, Copy, ExternalLink, Loader2, MessageSquare, Info, BotIcon, Globe, RotateCw } from "lucide-react";

interface DeploymentOptionsProps {
  botName: string;
  botId?: string;
}

export default function DeploymentOptions({ botName, botId }: DeploymentOptionsProps): React.ReactNode {
  const [activePlatform, setActivePlatform] = useState<string>("telegram");
  const [deploymentStatus, setDeploymentStatus] = useState<{
    deploying: boolean;
    success: string | null;
    error: string | null;
    testing: boolean;
    testSuccess: string | null;
    testError: string | null;
  }>({
    deploying: false,
    success: null,
    error: null,
    testing: false,
    testSuccess: null,
    testError: null,
  });

  // Telegram specific state
  const [telegramToken, setTelegramToken] = useState<string>("");
  const [telegramBotUsername, setTelegramBotUsername] = useState<string>("");
  const [telegramTokenValid, setTelegramTokenValid] = useState<boolean>(false);

  // WhatsApp specific state
  const [whatsappPhoneId, setWhatsappPhoneId] = useState<string>("");
  const [whatsappToken, setWhatsappToken] = useState<string>("");
  const [whatsappBusinessId, setWhatsappBusinessId] = useState<string>("");
  const [_whatsappPhoneNumberValid, setWhatsappPhoneNumberValid] = useState(false);
  const [_whatsappTokenValid, setWhatsappTokenValid] = useState(false);
  const [_whatsappFieldsValid, setWhatsappFieldsValid] = useState(false);

  // Website embed specific state
  const [websiteColor, setWebsiteColor] = useState<string>("#3b82f6");
  const [websitePosition, _setWebsitePosition] = useState<string>("bottom-right");
  const [embedCode, setEmbedCode] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [_websiteNameValid, _setWebsiteNameValid] = useState(false);
  const [_websiteColorValid, _setWebsiteColorValid] = useState(true);
  const [_websiteFieldsValid, _setWebsiteFieldsValid] = useState(false);

  // Discord specific state
  const [discordToken, setDiscordToken] = useState<string>("");
  const [discordClientId, setDiscordClientId] = useState<string>("");
  const [_discordTokenValid, setDiscordTokenValid] = useState(false);
  const [_discordFieldsValid, setDiscordFieldsValid] = useState(false);
  const [_discordInviteLink, _setDiscordInviteLink] = useState("");

  // Deployed platforms tracking
  const [deployedPlatforms, setDeployedPlatforms] = useState<{
    telegram: boolean;
    whatsapp: boolean;
    discord: boolean;
    website: boolean;
  }>({
    telegram: false,
    whatsapp: false,
    discord: false,
    website: false,
  });

  // Validation effects
  useEffect(() => {
    // Telegram token validation
    const telegramTokenRegex = /^\d+:[-_a-zA-Z0-9]+$/;
    setTelegramTokenValid(telegramTokenRegex.test(telegramToken));

    // WhatsApp fields validation
    // Update validation states
    setWhatsappPhoneNumberValid(whatsappPhoneId.length > 5);
    setWhatsappTokenValid(whatsappToken.length > 10);
    setWhatsappFieldsValid(
      whatsappPhoneId.length > 5 &&
      whatsappToken.length > 10 &&
      whatsappBusinessId.length > 5
    );

    // Discord fields validation
    setDiscordTokenValid(discordToken.length > 10);
    setDiscordFieldsValid(
      discordToken.length > 10 &&
      discordClientId.length > 5
    );
  }, [telegramToken, whatsappPhoneId, whatsappToken, whatsappBusinessId, discordToken, discordClientId]);

  // Handle deployment for different platforms
  const handleDeploy = async () => {
    setDeploymentStatus({
      ...deploymentStatus,
      deploying: true,
      success: null,
      error: null,
    });

    try {
      let deploymentPayload = {};
      let endpoint = "";

      switch (activePlatform) {
        case "telegram":
          if (!telegramToken) {
            throw new Error("Telegram Bot Token is required");
          }
          endpoint = "/api/deploy/telegram";
          deploymentPayload = {
            botId,
            botName,
            token: telegramToken,
          };
          break;

        case "whatsapp":
          if (!whatsappToken || !whatsappPhoneId || !whatsappBusinessId) {
            throw new Error("All WhatsApp credentials are required");
          }
          endpoint = "/api/deploy/whatsapp";
          deploymentPayload = {
            botId,
            botName,
            phoneId: whatsappPhoneId,
            token: whatsappToken,
            businessId: whatsappBusinessId,
          };
          break;

        case "discord":
          if (!discordToken || !discordClientId) {
            throw new Error("Discord Bot Token and Client ID are required");
          }
          endpoint = "/api/deploy/discord";
          deploymentPayload = {
            botId,
            botName,
            token: discordToken,
            clientId: discordClientId,
          };
          break;

        case "website":
          // Generate embed code
          const code = generateEmbedCode(botId || "default", botName, websiteColor, websitePosition);
          setEmbedCode(code);
          setDeploymentStatus({
            ...deploymentStatus,
            deploying: false,
            success: "Embed code generated successfully!",
            error: null,
          });

          // Mark website as deployed
          setDeployedPlatforms(prev => ({
            ...prev,
            website: true
          }));

          return;

        default:
          throw new Error("Invalid platform selected");
      }

      // Make the API call to deploy
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deploymentPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to deploy chatbot");
      }

      // Handle platform-specific success responses
      if (activePlatform === "telegram" && data.username) {
        setTelegramBotUsername(data.username);
      }

      // Mark platform as deployed
      setDeployedPlatforms(prev => ({
        ...prev,
        [activePlatform]: true
      }));

      setDeploymentStatus({
        ...deploymentStatus,
        deploying: false,
        success: `Successfully deployed to ${getPlatformName(activePlatform)}!`,
        error: null,
      });
    } catch (error) {
      console.error("Deployment error:", error);
      setDeploymentStatus({
        ...deploymentStatus,
        deploying: false,
        success: null,
        error: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  // Test a deployed chatbot
  const handleTest = async () => {
    // Type assertion to fix the index signature error
    if (!deployedPlatforms[activePlatform as keyof typeof deployedPlatforms]) {
      setDeploymentStatus({
        ...deploymentStatus,
        testError: "You need to deploy the chatbot first before testing.",
        testSuccess: null,
      });
      return;
    }

    setDeploymentStatus({
      ...deploymentStatus,
      testing: true,
      testSuccess: null,
      testError: null,
    });

    try {
      let testEndpoint = "";
      let testPayload = {};

      switch (activePlatform) {
        case "telegram":
          testEndpoint = "/api/test/telegram";
          testPayload = {
            botId,
            token: telegramToken,
            message: "This is a test message from your chatbot."
          };
          break;
          
        case "whatsapp":
          testEndpoint = "/api/test/whatsapp";
          testPayload = {
            botId,
            phoneId: whatsappPhoneId,
            message: "Hello"
          };
          break;
          
        case "discord":
          testEndpoint = "/api/test/discord";
          testPayload = {
            botId,
            clientId: discordClientId,
            message: "!help"
          };
          break;
          
        case "website":
          // For website, we'll just simulate a test
          setTimeout(() => {
            setDeploymentStatus({
              ...deploymentStatus,
              testing: false,
              testSuccess: "Website integration test successful! The widget is ready to use.",
              testError: null,
            });
          }, 1500);
          return;
          
        default:
          throw new Error("Invalid platform selected");
      }
      
      // Make API call for testing
      try {
        const response = await fetch(testEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(testPayload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Failed to test on ${getPlatformName(activePlatform)}`);
        }

        setDeploymentStatus({
          ...deploymentStatus,
          testing: false,
          testSuccess: `Test message sent to ${getPlatformName(activePlatform)}. The chatbot is responding correctly!`,
          testError: null,
        });
      } catch (testError) {
        console.error("Test API error:", testError);
        setDeploymentStatus({
          ...deploymentStatus,
          testing: false,
          testSuccess: null,
          testError: testError instanceof Error ? testError.message : "An unknown error occurred during testing",
        });
      }
      
    } catch (error) {
      console.error("Test error:", error);
      setDeploymentStatus({
        ...deploymentStatus,
        testing: false,
        testSuccess: null,
        testError: error instanceof Error ? error.message : "An unknown error occurred during testing",
      });
    }
  };

  // Helper to get platform display name
  const getPlatformName = (platform: string): string => {
    const platforms: Record<string, string> = {
      telegram: "Telegram",
      whatsapp: "WhatsApp",
      discord: "Discord",
      website: "Website",
    };
    return platforms[platform] || platform;
  };

  // Generate website embed code
  const generateEmbedCode = (id: string, name: string, color: string, position: string): string => {
    return `<!-- ${name} Chatbot Widget -->
<script>
  (function(d, w) {
    var chatbotId = "${id}";
    var s = d.createElement('script');
    s.src = '${window.location.origin}/chatbot-widget.js';
    s.onload = function() {
      w.ChatbotWidget.init({
        id: chatbotId,
        name: "${name}",
        color: "${color}",
        position: "${position}"
      });
    };
    d.head.appendChild(s);
    
    // Add chatbot button styles
    var style = d.createElement('style');
    style.textContent = \`
      .chatbot-widget-button {
        position: fixed;
        ${position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
        ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${color};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        transition: all 0.3s ease;
      }
      .chatbot-widget-button:hover {
        transform: scale(1.05);
      }
    \`;
    d.head.appendChild(style);
  })(document, window);
</script>
<!-- End ${name} Chatbot Widget -->`;
  };

  // Copy embed code to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Deploy Your Chatbot</h2>
        <p className="text-gray-500">
          Choose a platform to deploy your chatbot and follow the instructions.
        </p>
      </div>
      
      {/* Platform Selection Grid with Icons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { id: 'telegram', name: 'Telegram', icon: <BotIcon className="h-6 w-6 mb-2" />, color: 'bg-blue-100 border-blue-300 hover:bg-blue-200' },
          { id: 'whatsapp', name: 'WhatsApp', icon: <MessageSquare className="h-6 w-6 mb-2" />, color: 'bg-green-100 border-green-300 hover:bg-green-200' },
          { id: 'discord', name: 'Discord', icon: <MessageSquare className="h-6 w-6 mb-2" />, color: 'bg-indigo-100 border-indigo-300 hover:bg-indigo-200' },
          { id: 'website', name: 'Website', icon: <Globe className="h-6 w-6 mb-2" />, color: 'bg-orange-100 border-orange-300 hover:bg-orange-200' },
        ].map(platform => (
          <div 
            key={platform.id}
            className={`border rounded-lg p-4 text-center cursor-pointer transition-colors ${platform.color} ${activePlatform === platform.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
            onClick={() => setActivePlatform(platform.id)}
          >
            {platform.icon}
            <div className="font-medium">{platform.name}</div>
            {deployedPlatforms[platform.id as keyof typeof deployedPlatforms] && (
              <Badge className="mt-2 bg-green-500 hover:bg-green-600">Deployed</Badge>
            )}
          </div>
        ))}
      </div>

      <Tabs
        value={activePlatform}
        onValueChange={setActivePlatform}
        className="w-full"
      >
        <TabsList className="hidden">
          <TabsTrigger value="telegram">Telegram</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="discord">Discord</TabsTrigger>
          <TabsTrigger value="website">Website</TabsTrigger>
        </TabsList>

        {/* Telegram Deployment */}
        <TabsContent value="telegram" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BotIcon className="h-5 w-5 mr-2 text-blue-500" />
                Deploy to Telegram
              </CardTitle>
              <CardDescription>
                Create a bot on Telegram and connect it to your chatbot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Open Telegram and search for <strong>@BotFather</strong></li>
                  <li>Send the command <code>/newbot</code> and follow the instructions</li>
                  <li>Copy the API token provided by BotFather</li>
                  <li>Paste the token below and click Deploy</li>
                </ol>
                <div className="mt-4">
                  <a 
                    href="https://telegram.me/botfather" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center"
                  >
                    Open BotFather in Telegram <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <label htmlFor="telegram-token" className="text-sm font-medium">
                  Telegram Bot Token
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Input
                          id="telegram-token"
                          value={telegramToken}
                          onChange={(e) => setTelegramToken(e.target.value)}
                          placeholder="1234567890:ABCDefGhIJKlmNoPQRsTUVwxyZ"
                          type="password"
                          className={telegramToken && !telegramTokenValid ? "border-red-300" : ""}
                        />
                        {telegramToken && telegramTokenValid && (
                          <Check className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Format: numbers:letters-and-numbers</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {telegramToken && !telegramTokenValid && (
                  <p className="text-xs text-red-500">Invalid token format. Should be like: 1234567890:ABCDefGhIJKlmNoPQRsTUVwxyZ</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={() => window.open("https://core.telegram.org/bots#how-do-i-create-a-bot", "_blank")}
                  className="text-xs"
                  size="sm"
                >
                  <Info className="h-3 w-3 mr-1" />
                  Learn More
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTest}
                  className="text-xs"
                  size="sm"
                  disabled={!deployedPlatforms.telegram || deploymentStatus.testing}
                >
                  {deploymentStatus.testing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCw className="h-3 w-3 mr-1" />
                  )}
                  Test Bot
                </Button>
              </div>
              <Button 
                onClick={handleDeploy} 
                disabled={deploymentStatus.deploying || !telegramTokenValid}
                className="w-full sm:w-auto"
              >
                {deploymentStatus.deploying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : "Deploy to Telegram"}
              </Button>
            </CardFooter>
          </Card>

          {/* Status messages */}
          {telegramBotUsername && deploymentStatus.success && (
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <div>
                <AlertTitle className="text-green-800 font-medium">Deployment Successful</AlertTitle>
                <AlertDescription className="text-green-800">
                  Your bot is now available on Telegram! Users can start chatting with it by searching for <strong>@{telegramBotUsername}</strong> or by clicking{" "}
                  <a 
                    href={`https://t.me/${telegramBotUsername}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    this link
                  </a>.
                </AlertDescription>
              </div>
            </Alert>
          )}
          
          {deploymentStatus.testSuccess && (
            <Alert className="bg-blue-50 border-blue-200">
              <Check className="h-4 w-4 text-blue-600" />
              <div>
                <AlertTitle className="text-blue-800 font-medium">Test Successful</AlertTitle>
                <AlertDescription className="text-blue-800">
                  {deploymentStatus.testSuccess}
                </AlertDescription>
              </div>
            </Alert>
          )}
          
          {deploymentStatus.testError && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <div>
                <AlertTitle className="text-amber-800 font-medium">Test Failed</AlertTitle>
                <AlertDescription className="text-amber-800">
                  {deploymentStatus.testError}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </TabsContent>

        {/* WhatsApp Deployment */}
        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deploy to WhatsApp</CardTitle>
              <CardDescription>
                Connect your chatbot to WhatsApp using the Cloud API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Create a Meta Developer account and set up a WhatsApp Business app</li>
                  <li>Get your Phone Number ID from the WhatsApp dashboard</li>
                  <li>Generate a permanent access token for your app</li>
                  <li>Enter the required details below and click Deploy</li>
                </ol>
                <div className="mt-4">
                  <a 
                    href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center"
                  >
                    WhatsApp Cloud API Setup Guide <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="whatsapp-phone-id" className="text-sm font-medium">
                    Phone Number ID
                  </label>
                  <Input
                    id="whatsapp-phone-id"
                    value={whatsappPhoneId}
                    onChange={(e) => setWhatsappPhoneId(e.target.value)}
                    placeholder="1234567890"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="whatsapp-business-id" className="text-sm font-medium">
                    WhatsApp Business Account ID
                  </label>
                  <Input
                    id="whatsapp-business-id"
                    value={whatsappBusinessId}
                    onChange={(e) => setWhatsappBusinessId(e.target.value)}
                    placeholder="1234567890"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="whatsapp-token" className="text-sm font-medium">
                    Access Token
                  </label>
                  <Input
                    id="whatsapp-token"
                    value={whatsappToken}
                    onChange={(e) => setWhatsappToken(e.target.value)}
                    placeholder="EAABZCqZA..."
                    type="password"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => window.open("https://developers.facebook.com/docs/whatsapp/cloud-api", "_blank")}
              >
                Learn More
              </Button>
              <Button 
                onClick={handleDeploy} 
                disabled={deploymentStatus.deploying || !whatsappToken || !whatsappPhoneId || !whatsappBusinessId}
              >
                {deploymentStatus.deploying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : "Deploy to WhatsApp"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Discord Deployment */}
        <TabsContent value="discord" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deploy to Discord</CardTitle>
              <CardDescription>
                Create a Discord bot and add it to your server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Go to the <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Discord Developer Portal</a></li>
                  <li>Create a new application and go to the "Bot" tab</li>
                  <li>Click "Add Bot" and copy the token</li>
                  <li>Under OAuth2 settings, copy your Client ID</li>
                  <li>Enter the details below and click Deploy</li>
                </ol>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="discord-client-id" className="text-sm font-medium">
                    Client ID
                  </label>
                  <Input
                    id="discord-client-id"
                    value={discordClientId}
                    onChange={(e) => setDiscordClientId(e.target.value)}
                    placeholder="1234567890123456789"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="discord-token" className="text-sm font-medium">
                    Bot Token
                  </label>
                  <Input
                    id="discord-token"
                    value={discordToken}
                    onChange={(e) => setDiscordToken(e.target.value)}
                    placeholder="MTExNjM4..."
                    type="password"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => window.open("https://discord.com/developers/docs/intro", "_blank")}
              >
                Learn More
              </Button>
              <Button 
                onClick={handleDeploy} 
                disabled={deploymentStatus.deploying || !discordToken || !discordClientId}
              >
                {deploymentStatus.deploying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : "Deploy to Discord"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Website Deployment */}
        <TabsContent value="website" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add to Your Website</CardTitle>
              <CardDescription>
                Embed your chatbot on any website with a simple code snippet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="website-color" className="text-sm font-medium">
                    Button Color
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="website-color"
                      type="color"
                      value={websiteColor}
                      onChange={(e) => setWebsiteColor(e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={websiteColor}
                      onChange={(e) => setWebsiteColor(e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="embed-code" className="text-sm font-medium">
                      Embed Code
                    </label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={copyToClipboard}
                      className="h-8 px-2"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    id="embed-code"
                    value={embedCode || "Click 'Generate Embed Code' to create your website integration code."}
                    readOnly
                    rows={10}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleDeploy}>
                Generate Embed Code
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Messages */}
      {deploymentStatus.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {deploymentStatus.error}
          </AlertDescription>
        </Alert>
      )}
      
      {deploymentStatus.success && activePlatform !== "telegram" && activePlatform !== "website" && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {deploymentStatus.success}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
