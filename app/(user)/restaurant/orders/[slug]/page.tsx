"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ShoppingCart, ChevronRight } from "lucide-react";

// Mock data for a single order
const orderData = {
  id: "#45DF6",
  status: "Pending",
  orderedDate: "6.7.2022",
  orderDate: "Oct 6, 2022 - 3:25 PM",
  totalPrice: "N1,252.00",
  paymentOption: "Cash",
  orderChannel: "Microsite",
  processedBy: "John Desmond (#14FDA)",
  customerName: "John Luke (0801234567)",
  itemsCount: 4,
  items: [
    {
      quantity: "1x",
      name: "12 Pcs KFC Bucket",
      variant: "Crunchy",
      price: "N600.00",
    },
    {
      quantity: "1x",
      name: "12 Pcs KFC Bucket",
      variant: "Crunchy",
      price: "N600.00",
    },
    {
      quantity: "2x",
      name: "12 Pcs KFC Bucket",
      variant: "Crunchy",
      price: "N600.00",
    },
  ],
  summary: {
    paperBagCost: "N80.00",
    deliveryFee: "N350.00",
    serviceFee: "N30.00",
    estimatedProduct: "N2,400.00",
    estimatedTotal: "N14,855.00",
  },
  currentOrderIndex: 1,
  totalOrders: 84,
  image: "/images/foods/egusi.png",
};

export default function OrderDetailsPage() {
  const [currentOrder, setCurrentOrder] = useState(1); // For "Next Order" functionality

  const handleNextOrder = () => {
    if (currentOrder < orderData.totalOrders) {
      setCurrentOrder(currentOrder + 1);
      // In a real app, fetch next order data here
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-5 w-full mt-14 md:mt-0 max-w-3xl">
        <span>Order</span>
        <span>/</span>
        <span className="text-gray-900 font-medium">{orderData.id}</span>
      </div>
      <Card className="w-full max-w-3xl bg-white rounded-2xl pb-0">
        {/* Header */}
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
              <Image
                src={orderData.image} // Placeholder image
                alt="Order item"
                width={64}
                height={64}
                className="object-cover"
              />
            </div>
            <div>
              <Badge className="bg-blue-100 text-blue-800 mb-1">Pending</Badge>
              <h2 className="text-xl font-bold text-gray-900">
                Order {orderData.id}
              </h2>
              <p className="text-sm text-gray-500">
                Ordered on {orderData.orderedDate}
              </p>
            </div>
          </div>
        </CardHeader>

        {/* Order Information Accordion */}
        <Accordion type="single" collapsible defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger className="px-6">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Order Information
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-gray-500">Order Date</p>
                  <p className="font-medium text-gray-900">
                    {orderData.orderDate}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total Price</p>
                  <p className="font-medium text-gray-900">
                    {orderData.totalPrice}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Payment Option</p>
                  <p className="font-medium text-gray-900">
                    {orderData.paymentOption}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Order Channel</p>
                  <p className="font-medium text-gray-900">
                    {orderData.orderChannel}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Processed By</p>
                  <p className="font-medium text-gray-900">
                    {orderData.processedBy}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Customer's Name</p>
                  <p className="font-medium text-gray-900">
                    {orderData.customerName}
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Separator />

        {/* Customer's Order */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-orange-600 mb-4">
            Customer's Order
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {orderData.itemsCount} product from Store 4
          </p>
          <div className="space-y-4">
            {orderData.items.map((item, index) => (
              <div key={index} className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">
                    {item.quantity} {item.name}
                  </p>
                  <p className="text-sm text-gray-500">{item.variant}</p>
                </div>
                <p className="font-medium text-gray-900">{item.price}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Summary */}
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Paper bag cost:</span>
              <span className="font-medium text-gray-900">
                {orderData.summary.paperBagCost}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery fee:</span>
              <span className="font-medium text-gray-900">
                {orderData.summary.deliveryFee}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Service fee:</span>
              <span className="font-medium text-gray-900">
                {orderData.summary.serviceFee}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated product:</span>
              <span className="font-medium text-gray-900">
                {orderData.summary.estimatedProduct}
              </span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-bold">
              <span className="text-gray-900">Estimated total:</span>
              <span className="text-gray-900">
                {orderData.summary.estimatedTotal}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 rounded-b-3xl px-6 py-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Order {currentOrder} of {orderData.totalOrders}
          </p>
          <Button variant="outline" className="gap-2">
            Next Order
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
