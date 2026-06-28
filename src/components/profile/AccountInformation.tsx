import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { validateSAPhoneNumber, normalizeZAPhoneNumber } from "@/utils/shippingUtils";
import { compressImage } from "@/utils/imageCompression";
import {
  User,
  Edit,
  Shield,
  UserX,
  Pause,
  Mail,
  Calendar,
  Settings,
  AlertTriangle,
  Info,
  Phone,
  CheckCircle,
  Camera,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserProfile } from "@/types/address";

interface AccountInformationProps {
  profile: UserProfile | null;
  isTemporarilyAway: boolean;
  setIsTemporarilyAway: (value: boolean) => void;
  setIsEditDialogOpen: (value: boolean) => void;
}

const AccountInformation = ({
  profile,
  isTemporarilyAway,
  setIsTemporarilyAway,
  setIsEditDialogOpen,
}: AccountInformationProps) => {
  const { user } = useAuth();
  const [phoneInput, setPhoneInput] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [lockedNumber, setLockedNumber] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const pictureInputRef = useRef<HTMLInputElement>(null);

  const hasPhone = Boolean((profile as any)?.phone_number || lockedNumber);

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingPicture(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.75, format: "image/webp" });
      const fileName = `${user.id}/${Date.now()}.${compressed.extension}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(fileName, compressed.blob, { upsert: true, contentType: compressed.mimeType });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("profile-pictures").getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_picture_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (updateError) throw updateError;
      toast.success("Profile picture updated!");
      window.location.reload();
    } catch (err) {
      toast.error("Failed to upload profile picture");
      console.error(err);
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleSavePhone = async () => {
    const value = phoneInput.trim();
    if (!value) {
      toast.error("Please enter your phone number");
      return;
    }
    const normalized = normalizeZAPhoneNumber(value);
    if (!validateSAPhoneNumber(normalized)) {
      toast.error("Enter a valid South African phone number");
      return;
    }
    if (!user?.id) {
      toast.error("Not authenticated");
      return;
    }
    if (hasPhone) {
      toast.error("Phone number already set and cannot be changed");
      return;
    }

    setSavingPhone(true);
    try {
      // Fire auth metadata update in background (non-blocking)
      supabase.auth.updateUser({ data: { phone_number: normalized, phone: normalized } }).catch(() => {});

      // Persist to profiles table only if empty
      const { error } = await supabase
        .from("profiles")
        .update({ phone_number: normalized, updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .is("phone_number", null);

      if (error) {
        toast.error("Could not save phone number. Try again.");
        return;
      }

      // Optimistic lock without page reload
      setLockedNumber(normalized);
      toast.success("Phone number saved");
      setPhoneInput("");
    } finally {
      setSavingPhone(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card className="border-2 border-purple-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-t-lg">
          <CardTitle className="text-xl md:text-2xl flex items-center gap-3">
            <User className="h-6 w-6 text-purple-600" />
            Personal Information
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="ml-auto"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Profile Picture - More Prominent */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="relative flex-shrink-0">
                <Avatar className="h-24 w-24 border-4 border-purple-200 shadow-md">
                  <AvatarImage src={(profile as any)?.profile_picture_url || ""} className="object-cover" />
                  <AvatarFallback className="bg-purple-100 text-purple-600 text-2xl font-bold">
                    {((profile as any)?.first_name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => pictureInputRef.current?.click()}
                  disabled={uploadingPicture}
                  className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white border-2 border-white rounded-full p-2.5 shadow-lg transition-all hover:scale-110 disabled:opacity-50"
                  title="Upload profile picture"
                >
                  {uploadingPicture ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                </button>
                <input
                  ref={pictureInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePictureUpload}
                  aria-label="Upload profile picture"
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-lg font-semibold text-gray-900 mb-1">Profile Picture</p>
                <p className="text-sm text-gray-600 mb-3">
                  {(profile as any)?.profile_picture_url
                    ? "Click the camera icon below to change your picture"
                    : "Add a profile picture to make your account stand out"}
                </p>
                <div className="inline-block sm:block bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-xs text-purple-700 font-medium">
                  {uploadingPicture ? "Uploading..." : "Click the camera icon to upload (Max 5MB)"}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Name
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {(() => {
                    const fullName = (profile as any)?.full_name;
                    if (fullName) return fullName;
                    const fn = (profile as any)?.first_name;
                    const ln = (profile as any)?.last_name;
                    const combined = [fn, ln].filter(Boolean).join(" ");
                    return combined || profile?.name || "Not provided";
                  })()}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Email Address
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {profile?.email || "Not provided"}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Phone Number</span>
                </div>
                {hasPhone ? (
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-gray-900">{(profile as any)?.phone_number || lockedNumber}</p>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-gray-500">Locked</span>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="e.g., 081 234 5678"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !savingPhone && phoneInput.trim()) {
                          handleSavePhone();
                        }
                      }}
                      disabled={savingPhone}
                      className="sm:max-w-xs"
                    />
                    <Button onClick={handleSavePhone} disabled={savingPhone || !phoneInput.trim()} className="bg-book-600 hover:bg-book-700">
                      {savingPhone ? "Saving..." : "Save"}
                    </Button>
                    <p className="text-xs text-gray-500">You can only set this once.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Member Since
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Unknown"}
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">
                    Account Status
                  </span>
                </div>
                <Badge className="bg-green-600 text-white">
                  <Shield className="h-3 w-3 mr-1" />
                  Active & Verified
                </Badge>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card className="border-2 border-blue-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
          <CardTitle className="text-xl flex items-center gap-3">
            <Settings className="h-5 w-5 text-blue-600" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Temporarily Away Toggle */}
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Pause className="h-4 w-4 text-orange-600" />
                  <Label
                    htmlFor="temporarily-away"
                    className="text-base font-medium"
                  >
                    Temporarily Away
                  </Label>
                </div>
                <p className="text-sm text-gray-600">
                  Pause your listings when you're unavailable. Your books will
                  be hidden from search results.
                </p>
              </div>
              <Switch
                id="temporarily-away"
                checked={isTemporarilyAway}
                onCheckedChange={setIsTemporarilyAway}
              />
            </div>

            {isTemporarilyAway && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <Pause className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Your listings are currently paused and hidden from other
                  users. Turn off "Temporarily Away" to make them visible again.
                </AlertDescription>
              </Alert>
            )}

            {/* Account Information */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Account Information
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your account is secure and verified</li>
                <li>• Profile changes are updated immediately</li>
                <li>• Email notifications are enabled by default</li>
                <li>• Your data is protected and encrypted</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security & Privacy */}
      <Card className="border-2 border-red-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 rounded-t-lg">
          <CardTitle className="text-xl flex items-center gap-3 text-red-700">
            <Shield className="h-5 w-5" />
            Security & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your personal information is secure and only shared with buyers
                during transactions. We never share your contact details
                publicly.
              </AlertDescription>
            </Alert>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <UserX className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-800 mb-2">
                    Delete Account
                  </h3>
                  <p className="text-sm text-red-600 mb-4">
                    Permanently delete your account and all associated data.
                    This action cannot be undone and will remove all your
                    listings.
                  </p>
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => {

                      alert(
                        "Account deletion feature will be implemented soon.",
                      );
                    }}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Delete My Account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountInformation;
