import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  ExternalLink,
  Calendar,
  User,
  Phone,
  Building2,
  Copy,
  Info,
} from "lucide-react";
import {
  trackUnifiedShipment,
  UnifiedTrackingResponse,
} from "@/services/unifiedDeliveryService";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UnifiedTrackingComponentProps {
  initialTrackingNumber?: string;
  provider?: "bobgo";
  onClose?: () => void;
}

const UnifiedTrackingComponent: React.FC<UnifiedTrackingComponentProps> = ({
  initialTrackingNumber = "",
  provider,
  onClose,
}) => {
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber);
  const [trackingData, setTrackingData] =
    useState<UnifiedTrackingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTrackingNumber) {
      handleTrack();
    }
  }, [initialTrackingNumber, provider]);

  const handleTrack = async () => {
    if (!trackingNumber.trim()) {
      toast.error("Please enter a tracking number");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await trackUnifiedShipment(trackingNumber.trim(), provider);
      setTrackingData(data);

      if (data.status === "delivered") {
        toast.success("Package delivered!");
      }
    } catch (err) {
      setError(
        "Unable to track this shipment. Please check the tracking number and try again.",
      );
      toast.error("Failed to track shipment");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const normalizedStatus = (status || "").toLowerCase().replace(/_/g, "-");
    switch (normalizedStatus) {
      case "delivered":
      case "ready-for-pickup":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "out-for-delivery":
      case "out_for_delivery":
        return <Truck className="h-5 w-5 text-blue-500" />;
      case "in-transit":
      case "in_transit":
        return <Package className="h-5 w-5 text-orange-500" />;
      case "collected":
      case "awaiting-dropoff":
        return <CheckCircle className="h-5 w-5 text-yellow-500" />;
      case "failed":
      case "failed-delivery":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "cancelled":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = (status || "").toLowerCase().replace(/_/g, "-");
    switch (normalizedStatus) {
      case "delivered":
      case "ready-for-pickup":
        return "bg-green-100 text-green-700 border-green-200";
      case "out-for-delivery":
      case "out_for_delivery":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "in-transit":
      case "in_transit":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "collected":
      case "awaiting-dropoff":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "failed":
      case "failed-delivery":
        return "bg-red-100 text-red-700 border-red-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    const normalizedStatus = (status || "").toLowerCase().replace(/_/g, "-");
    switch (normalizedStatus) {
      case "pending":
      case "awaiting-dropoff":
        return "Order Confirmed";
      case "collected":
        return "Collected";
      case "in-transit":
      case "in_transit":
        return "In Transit";
      case "out-for-delivery":
      case "out_for_delivery":
        return "Out for Delivery";
      case "delivered":
      case "ready-for-pickup":
        return "Delivered";
      case "failed":
      case "failed-delivery":
        return "Delivery Failed";
      case "cancelled":
        return "Cancelled";
      default:
        return status || "Unknown Status";
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Search Section */}
      <div className="w-full">
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Enter tracking number (e.g., TRK123456789)"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleTrack()}
            className="h-12 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Button
            onClick={handleTrack}
            disabled={loading || !trackingNumber.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white h-12 font-semibold rounded-lg transition w-full"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                Tracking...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Track Order
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-8 w-8 rounded-full border-3 border-gray-200 border-t-blue-600 animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">Tracking your package...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 text-sm">Tracking failed</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Results */}
      {trackingData && (
        <div className="space-y-6">
          {/* Simulated Data Warning */}
          {trackingData.simulated && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
              <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-amber-900 text-xs sm:text-sm">Delivery Rates</p>
                <p className="text-amber-700 text-xs mt-1">
                  Tracking data provided by our delivery network. Real-time updates will appear once the shipment is in transit.
                </p>
              </div>
            </div>
          )}

          {/* Courier Header with Logo */}
          <Card className="border border-gray-200 shadow-sm">
            <div className="bg-white border-b border-gray-200">
              <CardHeader className="p-4 sm:p-6">
                {/* Courier Logo Banner */}
                {(trackingData as any).bobgo_logo && (
                  <div className="flex justify-center mb-4 pb-4 border-b border-gray-200">
                    <img
                      src={(trackingData as any).bobgo_logo}
                      alt="Courier Logo"
                      className="h-8 sm:h-10 object-contain"
                    />
                  </div>
                )}
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 justify-center">
                  {/* Courier Logo and Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 justify-center sm:justify-start">
                    {trackingData.courier_logo ? (
                      <img
                        src={trackingData.courier_logo}
                        alt={trackingData.courier_name || "Courier"}
                        className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-lg border border-gray-200 bg-white p-1 flex-shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg border border-gray-300 bg-white flex items-center justify-center flex-shrink-0">
                        <Truck className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <h2 className="text-lg sm:text-2xl font-bold text-gray-900 break-words">
                        {trackingData.courier_name || "Shipment"}
                      </h2>
                      {trackingData.courier_phone && (
                        <div className="flex items-center gap-1 mt-1 text-xs sm:text-sm text-gray-600 justify-center sm:justify-start">
                          <Phone className="h-3 sm:h-4 w-3 sm:w-4 flex-shrink-0" />
                          <span className="font-medium">{trackingData.courier_phone}</span>
                        </div>
                      )}
                      {trackingData.service_level && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-2 break-words font-semibold bg-blue-50 inline-block px-2 py-1 rounded">
                          Service: {trackingData.service_level}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <Badge
                    variant="outline"
                    className={`${getStatusColor(trackingData.status)} text-xs sm:text-base py-2 sm:py-3 px-3 sm:px-5 font-bold border-2 flex-shrink-0 whitespace-nowrap`}
                  >
                    {getStatusText(trackingData.status)}
                  </Badge>
                </div>
              </CardHeader>
            </div>

            <CardContent className="space-y-5 p-4 sm:p-6">
              {/* Merchant/Seller Info */}
              {trackingData.merchant_name && (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 justify-center">
                  {trackingData.merchant_logo && (
                    <img
                      src={trackingData.merchant_logo}
                      alt={trackingData.merchant_name}
                      className="h-12 w-12 sm:h-14 sm:w-14 object-contain rounded border border-gray-200 bg-white p-0.5 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Merchant / Seller</p>
                    <p className="text-sm sm:text-base font-bold text-gray-900 break-words">
                      {trackingData.merchant_name}
                    </p>
                  </div>
                </div>
              )}

              {/* Tracking Numbers Section */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center">Tracking Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Primary Tracking Number */}
                  <div className="bg-white rounded-lg border border-gray-300 p-3 sm:p-4 hover:border-blue-400 transition sm:col-span-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-1 text-center">Tracking Number</p>
                    <div className="flex items-center justify-center gap-2 min-w-0">
                      <p className="font-mono font-bold text-xs sm:text-sm text-gray-900 break-all text-center">
                        {trackingData.tracking_number}
                      </p>
                      <button
                        onClick={() => copyToClipboard(trackingData.tracking_number)}
                        className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Custom Tracking Reference */}
                  {trackingData.custom_tracking_reference && (
                    <div className="bg-white rounded-lg border border-gray-300 p-3 sm:p-4 hover:border-blue-400 transition">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Custom Reference</p>
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <p className="font-mono font-bold text-xs sm:text-sm text-gray-900 break-all">
                          {trackingData.custom_tracking_reference}
                        </p>
                        <button
                          onClick={() => copyToClipboard(trackingData.custom_tracking_reference || "")}
                          className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Courier Slug */}
                  {trackingData.courier_slug && (
                    <div className="bg-white rounded-lg border border-gray-300 p-3 sm:p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Courier Slug</p>
                      <p className="font-mono font-bold text-xs sm:text-sm text-gray-900 break-all">
                        {trackingData.courier_slug}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Status & Location */}
              <div className="flex items-center space-x-3 sm:space-x-4 p-4 rounded-lg border border-gray-200 bg-white justify-center">
                <div className="flex-shrink-0">
                  {getStatusIcon(trackingData.status)}
                </div>
                <div className="flex-1 min-w-0 text-center">
                  <h4 className="font-bold text-gray-900 text-base sm:text-lg">
                    {getStatusText(trackingData.status)}
                  </h4>
                  {trackingData.current_location && (
                    <p className="text-xs sm:text-sm text-gray-700 mt-1 flex items-center gap-1 flex-wrap justify-center">
                      <MapPin className="h-3 sm:h-4 w-3 sm:w-4 flex-shrink-0" />
                      <span className="break-words">{trackingData.current_location}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Timeline Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Created At */}
                {trackingData.created_at && (
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                    <div className="flex items-start space-x-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Created</p>
                    </div>
                    <p className="font-bold text-gray-900 text-xs sm:text-sm break-words">
                      {formatDateTime(trackingData.created_at)}
                    </p>
                  </div>
                )}

                {/* Estimated Delivery */}
                {trackingData.estimated_delivery && trackingData.estimated_delivery.trim() && (
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                    <div className="flex items-start space-x-2 mb-2">
                      <Clock className="h-4 w-4 text-gray-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Est. Delivery</p>
                    </div>
                    <p className="font-bold text-gray-900 text-xs sm:text-sm break-words">
                      {formatDateTime(trackingData.estimated_delivery)}
                    </p>
                  </div>
                )}

                {/* Actual Delivery */}
                {trackingData.actual_delivery && trackingData.actual_delivery.trim() && (
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                    <div className="flex items-start space-x-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-gray-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Delivered</p>
                    </div>
                    <p className="font-bold text-gray-900 text-xs sm:text-sm break-words">
                      {formatDateTime(trackingData.actual_delivery)}
                    </p>
                  </div>
                )}

                {/* Last Updated */}
                {trackingData.last_updated && (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                    <div className="flex items-start space-x-2 mb-2">
                      <Clock className="h-4 w-4 text-gray-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Last Update</p>
                    </div>
                    <p className="font-bold text-gray-900 text-xs sm:text-sm break-words">
                      {formatDateTime(trackingData.last_updated)}
                    </p>
                  </div>
                )}
              </div>

              {/* Order Information */}
              {(trackingData.order_number || trackingData.channel_order_number) && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center">Order Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {trackingData.order_number && (
                        <div className="bg-white rounded-lg border border-gray-300 p-3 sm:p-4">
                          <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Order Number</p>
                          <p className="font-mono font-bold text-xs sm:text-sm text-gray-900 break-all">
                            {trackingData.order_number}
                          </p>
                        </div>
                      )}
                      {trackingData.channel_order_number && (
                        <div className="bg-white rounded-lg border border-gray-300 p-3 sm:p-4">
                          <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Channel Order Number</p>
                          <p className="font-mono font-bold text-xs sm:text-sm text-gray-900 break-all">
                            {trackingData.channel_order_number}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Recipient Signature */}
              {trackingData.recipient_signature && (
                <div className="flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200 justify-center">
                  <User className="h-4 sm:h-5 w-4 sm:w-5 text-green-600 flex-shrink-0" />
                  <div className="min-w-0 text-center">
                    <p className="text-xs font-semibold text-green-700 uppercase">Signed by</p>
                    <p className="font-medium text-gray-900 text-xs sm:text-sm break-words">
                      {trackingData.recipient_signature}
                    </p>
                  </div>
                </div>
              )}

              {/* External Tracking Link */}
              <Button
                onClick={() => {
                  const url = trackingData.tracking_url || `https://track.bobgo.co.za/${encodeURIComponent(trackingData.tracking_number)}`;
                  window.open(url, "_blank");
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Detailed Tracking
              </Button>
            </CardContent>
          </Card>

          {/* Tracking History */}
          {trackingData.events.length > 0 && (
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="p-4 sm:p-6 border-b border-gray-200">
                <CardTitle className="flex items-center space-x-3 text-lg font-bold text-gray-900 justify-center">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <span>Tracking History ({trackingData.events.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="space-y-0">
                  {trackingData.events.map((event, index) => (
                    <div key={index} className="relative">
                      {/* Timeline line */}
                      {index < trackingData.events.length - 1 && (
                        <div className="absolute left-4 sm:left-8 top-14 sm:top-16 bottom-0 w-0.5 bg-gradient-to-b from-blue-300 to-gray-200"></div>
                      )}

                      {/* Event item */}
                      <div className="flex gap-2 sm:gap-4 pb-6">
                        {/* Icon circle */}
                        <div className="relative flex-shrink-0 mt-1">
                          <div className="flex items-center justify-center h-8 sm:h-12 w-8 sm:w-12 rounded-full bg-white border-2 sm:border-3 border-blue-500 shadow-md relative z-10">
                            {getStatusIcon(event.status)}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:shadow-md transition hover:border-blue-300 min-w-0">
                          <div className="flex flex-col gap-1 mb-2 items-center text-center">
                            <h4 className="font-bold text-gray-900 text-xs sm:text-sm break-words">
                              {event.description}
                            </h4>
                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full w-fit">
                              {formatDateTime(event.timestamp)}
                            </span>
                          </div>

                          {event.location && (
                            <div className="flex items-center justify-center text-xs sm:text-sm text-gray-600 mt-2 gap-1">
                              <MapPin className="h-3 sm:h-4 w-3 sm:w-4 flex-shrink-0 text-gray-400" />
                              <span className="font-medium break-words">{event.location}</span>
                            </div>
                          )}

                          {event.signature && (
                            <div className="flex items-center justify-center text-xs sm:text-sm text-green-700 bg-green-50 rounded p-2 mt-2 border border-green-200 gap-1">
                              <CheckCircle className="h-3 sm:h-4 w-3 sm:w-4 flex-shrink-0" />
                              <span className="font-medium break-words">Signed by: {event.signature}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      )}

      {/* Close Button */}
      {onClose && (
        <div className="flex justify-center">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      )}
    </div>
  );
};

export default UnifiedTrackingComponent;
