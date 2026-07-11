import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import ModernAddressTab from "@/components/profile/ModernAddressTab";
import { AddressData, Address } from "@/types/address";

interface AddressesTabProps {
  user: any;
  addressData: AddressData | null;
  isLoadingAddress: boolean;
  pickupEnabled: boolean;
  setPickupEnabled: (b: boolean) => void;
  savingPickup: boolean;
  handleSaveAddresses: (pickup: Address, same: boolean) => Promise<void>;
  loadUserAddresses: () => Promise<void>;
}

export const AddressesTab: React.FC<AddressesTabProps> = ({
  user,
  addressData,
  isLoadingAddress,
  pickupEnabled,
  setPickupEnabled,
  savingPickup,
  handleSaveAddresses,
  loadUserAddresses,
}) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-bold text-gray-900 text-base mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-book-600" /> Physical Shop & Courier Drop Addresses
          </h3>
          <ModernAddressTab />
        </CardContent>
      </Card>
    </div>
  );
};
