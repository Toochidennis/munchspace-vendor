"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Users,
  Percent,
  ChevronRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Mock data for different periods
const mockData = {
  last30: {
    traffic: [
      { time: "08:00am", customers: 45 },
      { time: "10:00am", customers: 180 },
      { time: "12:00pm", customers: 120 },
      { time: "02:00pm", customers: 85 },
      { time: "04:00pm", customers: 150 },
      { time: "06:00pm", customers: 110 },
    ],
    bestSelling: [
      { name: "Jollof Rice", sales: 281 },
      { name: "Fried Chicken", sales: 240 },
      { name: "Pounded Yam & Egusi", sales: 151 },
      { name: "Suya", sales: 225 },
      { name: "Plantain & Beans", sales: 171 },
      { name: "Eba & Soup", sales: 130 },
      { name: "Pizza", sales: 98 },
      { name: "Burger", sales: 87 },
    ],
    recentOrders: [
      {
        id: "#45DF65",
        date: "Aug 21, 2024 3:25 PM",
        price: "N1,250",
        status: "Cancelled",
      },
      {
        id: "#45DF66",
        date: "Aug 21, 2024 2:45 PM",
        price: "N2,800",
        status: "Completed",
      },
      {
        id: "#45DF67",
        date: "Aug 21, 2024 1:10 PM",
        price: "N1,500",
        status: "Completed",
      },
      {
        id: "#45DF68",
        date: "Aug 20, 2024 7:30 PM",
        price: "N3,200",
        status: "Pending",
      },
      {
        id: "#45DF69",
        date: "Aug 20, 2024 5:15 PM",
        price: "N900",
        status: "Completed",
      },
    ],
    kpis: {
      totalOrders: 21378,
      totalOrdersTrend: -2.53,
      totalReturns: 105,
      totalReturnsTrend: -2.53,
      newCustomers: 132,
      newCustomersTrend: 5.53,
      totalDiscount: 504,
      totalDiscountTrend: -5.53,
    },
  },
  last7: {
    traffic: [
      { time: "08:00am", customers: 30 },
      { time: "10:00am", customers: 120 },
      { time: "12:00pm", customers: 90 },
      { time: "02:00pm", customers: 60 },
      { time: "04:00pm", customers: 100 },
      { time: "06:00pm", customers: 75 },
    ],
    bestSelling: [
      { name: "Jollof Rice", sales: 98 },
      { name: "Fried Chicken", sales: 85 },
      { name: "Suya", sales: 72 },
      { name: "Pounded Yam & Egusi", sales: 65 },
      { name: "Burger", sales: 55 },
    ],
    recentOrders: [
      {
        id: "#45DF70",
        date: "Aug 17, 2024 4:10 PM",
        price: "N1,800",
        status: "Completed",
      },
      {
        id: "#45DF71",
        date: "Aug 17, 2024 2:30 PM",
        price: "N950",
        status: "Pending",
      },
      {
        id: "#45DF72",
        date: "Aug 16, 2024 6:45 PM",
        price: "N2,200",
        status: "Completed",
      },
    ],
    kpis: {
      totalOrders: 5421,
      totalOrdersTrend: 8.12,
      totalReturns: 32,
      totalReturnsTrend: -12.4,
      newCustomers: 45,
      newCustomersTrend: 15.2,
      totalDiscount: 189,
      totalDiscountTrend: 3.8,
    },
  },
  today: {
    traffic: [
      { time: "08:00am", customers: 15 },
      { time: "10:00am", customers: 60 },
      { time: "12:00pm", customers: 45 },
      { time: "02:00pm", customers: 30 },
      { time: "04:00pm", customers: 50 },
      { time: "06:00pm", customers: 40 },
    ],
    bestSelling: [
      { name: "Jollof Rice", sales: 32 },
      { name: "Fried Chicken", sales: 28 },
      { name: "Suya", sales: 20 },
    ],
    recentOrders: [
      {
        id: "#45DF73",
        date: "Aug 21, 2024 11:20 AM",
        price: "N1,100",
        status: "Completed",
      },
      {
        id: "#45DF74",
        date: "Aug 21, 2024 10:05 AM",
        price: "N750",
        status: "Pending",
      },
    ],
    kpis: {
      totalOrders: 240,
      totalOrdersTrend: 12.5,
      totalReturns: 5,
      totalReturnsTrend: -20,
      newCustomers: 18,
      newCustomersTrend: 28.6,
      totalDiscount: 42,
      totalDiscountTrend: 10.5,
    },
  },
};

const colorPalette = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-red-500",
];

export default function DashboardPage() {
  const [period, setPeriod] = useState<"last30" | "last7" | "today">("last30");

  const data = mockData[period];

  const top5Items = data.bestSelling.slice(0, 5);
  const totalSales = top5Items.reduce((sum, item) => sum + item.sales, 0);

  return (
    <div className="min-h-screen p-6 lg:p-8 mt-10 md:mt-0">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hi Idris,</h1>
            <p className="text-gray-600 mt-1">Welcome to your dashboard</p>
          </div>
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as typeof period)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last30">Last 30 days</SelectItem>
              <SelectItem value="last7">Last 7 days</SelectItem>
              <SelectItem value="today">Today</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Store Traffic + KPI Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Store Traffic Chart */}
          <div className="overflow-x-auto scrollbar-custom scrollbar-no-arrows pb-2 md:col-span-3">
            <Card className="md:col-span-3 rounded-lg pb-0 pe-4 shadow-none min-w-130 border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg">Store Traffic</CardTitle>
                <CardDescription>
                  Track the number of customers who visited your store.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.traffic}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#000",
                        border: "none",
                        borderRadius: "8px",
                      }}
                      isAnimationActive={false}
                      labelStyle={{ color: "#fff" }}
                      itemStyle={{ color: "#fff" }}
                      cursor={false}
                    />
                    <Bar dataKey="customers" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* KPI Cards */}
          <div className="md:col-span-3 lg:col-span-2 scrollbar-custom scrollbar-no-arrows pb-2 w-full overflow-x-auto relative">
            <div className="grid grid-cols-2 gap-2 md:gap-4 whitespace-nowrap text-center min-w-95 ">
              <Card className="gap-1 shadow-none md:gap-4 border-gray-100 px-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 justify-center">
                    <ShoppingBag className="h-5 w-5 text-blue-600" />
                    Total Orders
                  </CardTitle>
                  <p
                    className={cn(
                      "text-sm flex items-center gap-1 justify-center",
                      data.kpis.totalOrdersTrend > 0
                        ? "text-green-600"
                        : "text-red-600"
                    )}
                  >
                    {data.kpis.totalOrdersTrend > 0 ? "+" : ""}
                    {data.kpis.totalOrdersTrend}%
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {data.kpis.totalOrders.toLocaleString()}
                  </p>
                  <div className="max-w-35 mx-auto bg-gray-200 rounded-full h-2 mt-4">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: "75%" }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="gap-1 shadow-none md:gap-4 border-gray-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 justify-center">
                    <ShoppingBag className="h-5 w-5 text-purple-600" />
                    Total Returns
                  </CardTitle>
                  <p
                    className={cn(
                      "text-sm flex items-center gap-1 justify-center",
                      data.kpis.totalReturnsTrend > 0
                        ? "text-green-600"
                        : "text-red-600"
                    )}
                  >
                    {data.kpis.totalReturnsTrend > 0 ? "+" : ""}
                    {data.kpis.totalReturnsTrend}%
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{data.kpis.totalReturns}</p>
                  <div className="max-w-35 mx-auto bg-gray-200 rounded-full h-2 mt-4">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: "40%" }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="gap-1 shadow-none md:gap-4 border-gray-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 justify-center">
                    <Users className="h-5 w-5 text-yellow-600" />
                    <span>New Customers</span>
                  </CardTitle>
                  <p
                    className={cn(
                      "text-sm flex items-center gap-1 justify-center",
                      data.kpis.newCustomersTrend > 0
                        ? "text-green-600"
                        : "text-red-600"
                    )}
                  >
                    {data.kpis.newCustomersTrend > 0 ? "+" : ""}
                    {data.kpis.newCustomersTrend}%
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{data.kpis.newCustomers}</p>
                  <div className="max-w-35 mx-auto bg-gray-200 rounded-full h-2 mt-4">
                    <div
                      className="bg-yellow-600 h-2 rounded-full transition-all"
                      style={{ width: "65%" }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="gap-1 shadow-none md:gap-4 border-gray-100 px-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 justify-center">
                    <Percent className="h-5 w-5 text-red-600" />
                    Total discount
                  </CardTitle>
                  <p
                    className={cn(
                      "text-sm flex items-center gap-1 justify-center",
                      data.kpis.totalDiscountTrend > 0
                        ? "text-green-600"
                        : "text-red-600"
                    )}
                  >
                    {data.kpis.totalDiscountTrend > 0 ? "+" : ""}
                    {data.kpis.totalDiscountTrend}%
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {data.kpis.totalDiscount}
                  </p>
                  <div className="max-w-35 mx-auto bg-gray-200 rounded-full h-2 mt-4">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all"
                      style={{ width: "85%" }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Best Selling Items - Top 5 with Single Progress Bar */}
        <Card className="border-transparent shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Best selling Items</CardTitle>
              <CardDescription>
                Know your best selling items and maintain it.
              </CardDescription>
            </div>
            <Link href="/restaurant/dashboard/items">
              <Button variant="outline" size="sm" className="gap-2">
                All Items
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Single Progress Bar with Stacked Segments */}
              <div className="w-full bg-gray-200 h-2">
                <div className="flex h-full">
                  {top5Items.map((item, index) => {
                    const percentage = (item.sales / totalSales) * 100;
                    const color = colorPalette[index % colorPalette.length];
                    return (
                      <div
                        key={item.name}
                        className={cn(
                          "h-full flex items-center justify-center text-white text-xs font-medium",
                          color
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="w-full whitespace-nowrap overflow-x-auto pb-2">
                <div className="flex h-full gap-5">
                  {top5Items.map((item, index) => {
                    const color = colorPalette[index % colorPalette.length];
                    return (
                      <div
                        key={item.name}
                        className={cn("h-full flex gap-3 text-xs")}
                      >
                        <div>
                          <div className="flex items-center gap-1">
                            <span
                              className={cn("w-3 h-3 rounded-full", color)}
                            ></span>
                            <p className="font-bold text-sm">{item.sales}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-transparent rounded-full"></span>
                            <p className="text-sm">{item.name}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="border-gray-100 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent orders</CardTitle>
              <CardDescription>
                See your items that are sold recently.
              </CardDescription>
            </div>
            <Link href="/restaurant/orders">
              <Button variant="outline" size="sm" className="gap-2">
                All Orders
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <Table className="rounded">
              <TableHeader className="bg-gray-100 py-2">
                <TableRow>
                  <TableHead className="text-gray-600">Order ID</TableHead>
                  <TableHead className="text-gray-600">Order Date</TableHead>
                  <TableHead className="text-gray-600">Total Price</TableHead>
                  <TableHead className="text-gray-600">Status</TableHead>
                  <TableHead className="text-right text-gray-500"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>{order.price}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          order.status === "Completed" &&
                            "bg-green-50 text-green-700 border-green-200",
                          order.status === "Cancelled" &&
                            "bg-red-50 text-red-700 border-red-200",
                          order.status === "Pending" &&
                            "bg-yellow-50 text-yellow-700 border-yellow-200"
                        )}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
