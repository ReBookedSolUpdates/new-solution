import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Truck, ShieldAlert, BadgeCheck } from "lucide-react";
import ModernAddressTab from "@/components/profile/ModernAddressTab";

export const AddressesTab: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
      {/* Address Form Container */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <MapPin className="h-5 w-5 text-book-600" /> Physical Shop & Courier Drop Addresses
              </h3>
              <p className="text-xs text-gray-400 font-medium mt-1">
                Configure your physical pickup points. Lockers and street addresses are supported.
              </p>
            </div>
            
            {/* Render the full address management tab */}
            <ModernAddressTab />
          </CardContent>
        </Card>
      </div>

      {/* Info Sidebar for Business Logistics */}
      <div className="space-y-6">
        {/* Logistics Information */}
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardContent className="p-6 space-y-4">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Truck className="h-4.5 w-4.5 text-book-600" /> Shipping & Fulfillment
            </h4>
            <ul className="space-y-3.5 text-xs text-gray-600">
              <li className="flex gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Courier Pickups:</strong> When a sale is committed, a courier is dispatched automatically to your pickup address.
                </span>
              </li>
              <li className="flex gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Pre-Paid Waybills:</strong> Waybills are automatically generated and sent to your email. Just print and stick.
                </span>
              </li>
              <li className="flex gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Locker Deliveries:</strong> Link your locker ID to allow seamless drop-offs at nearby lockers across SA.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Warning card */}
        <Card className="border border-amber-250 bg-amber-50/40 shadow-sm">
          <CardContent className="p-5 flex gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900 text-xs">Verify Pickup Addresses</h4>
              <p className="text-[11px] text-amber-800 leading-relaxed mt-1">
                Ensure your addresses are correct. Inaccurate locations can result in failed courier pickups, delays, and penalty fees.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddressesTab;
