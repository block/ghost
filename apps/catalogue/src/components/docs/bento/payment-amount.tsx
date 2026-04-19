"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@ghost/ui";
import { Minus, Plus } from "lucide-react";
import * as React from "react";

export function PaymentAmount() {
  const [amount, setAmount] = React.useState(350);

  function onClick(adjustment: number) {
    setAmount(Math.max(200, Math.min(400, amount + adjustment)));
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle>Payment Amount</CardTitle>
        <CardDescription>Set your payment amount.</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            appearance="icon"
            className="h-12 w-12 shrink-0 rounded-full border-border-standard"
            onClick={() => onClick(-10)}
            disabled={amount <= 200}
          >
            <Minus />
            <span className="sr-only">Decrease</span>
          </Button>
          <div className="flex-1 text-center">
            <div className="text-6xl font-mono font-bold">${amount}</div>
            <div className="text-[0.70rem] uppercase text-muted-foreground">
              USD
            </div>
          </div>
          <Button
            variant="outline"
            appearance="icon"
            className="h-12 w-12 shrink-0 rounded-full border-border-standard"
            onClick={() => onClick(10)}
            disabled={amount >= 400}
          >
            <Plus />
            <span className="sr-only">Increase</span>
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Pay Now</Button>
      </CardFooter>
    </Card>
  );
}
