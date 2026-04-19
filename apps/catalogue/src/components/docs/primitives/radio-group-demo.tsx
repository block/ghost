import { Label, RadioGroup, RadioGroupItem } from "@ghost/ui";

const plans = [
  {
    id: "starter",
    name: "Starter Plan",
    description:
      "Perfect for small businesses getting started with our platform",
    price: "$10",
  },
  {
    id: "pro",
    name: "Pro Plan",
    description: "Advanced features for growing businesses with higher demands",
    price: "$20",
  },
] as const;

export function RadioGroupDemo() {
  return (
    <div className="flex flex-col gap-6">
      <RadioGroup defaultValue="comfortable">
        <div className="flex items-center gap-3">
          <RadioGroupItem value="default" id="r1" />
          <Label htmlFor="r1">Default</Label>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroupItem value="comfortable" id="r2" />
          <Label htmlFor="r2">Comfortable</Label>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroupItem value="compact" id="r3" />
          <Label htmlFor="r3">Compact</Label>
        </div>
      </RadioGroup>
      <RadioGroup defaultValue="starter" className="max-w-sm">
        {plans.map((plan) => (
          <Label
            className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-border"
            key={plan.id}
          >
            <RadioGroupItem
              value={plan.id}
              id={plan.name}
              className=" data-[state=checked]:border-none data-[state=checked]:bg-primary *:data-[slot=radio-group-indicator]:[&>svg]:fill-white *:data-[slot=radio-group-indicator]:[&>svg]:stroke-white"
            />
            <div className="grid gap-1 font-normal">
              <div className="">{plan.name}</div>
              <div className="text-muted-foreground leading-snug">
                {plan.description}
              </div>
            </div>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}
