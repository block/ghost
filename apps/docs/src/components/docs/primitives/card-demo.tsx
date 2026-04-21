import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "ghost-ui";
import { BathIcon, BedIcon, LandPlotIcon } from "lucide-react";
export function CardDemo() {
  return (
    <div className="flex w-full flex-col items-start justify-center gap-4">
      <Card className="w-full @3xl:max-w-1/2">
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" type="password" required />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button type="submit" className="w-full">
            Login
          </Button>
          <Button variant="outline" className="w-full">
            Login with Google
          </Button>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <a href="#" className="underline underline-offset-4">
              Sign up
            </a>
          </div>
        </CardFooter>
      </Card>
      <Card className="w-full @3xl:max-w-1/2">
        <CardHeader>
          <CardTitle>Meeting Notes</CardTitle>
          <CardDescription>
            Transcript from the meeting with the client.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            Client requested dashboard redesign with focus on mobile
            responsiveness.
          </p>
          <ol className="mt-4 flex list-decimal flex-col gap-2 pl-6">
            <li>New analytics widgets for daily/weekly metrics</li>
            <li>Simplified navigation menu</li>
            <li>Dark mode support</li>
            <li>Timeline: 6 weeks</li>
            <li>Follow-up meeting scheduled for next Tuesday</li>
          </ol>
        </CardContent>
        <CardFooter>
          <div className="*:data-[slot=avatar]:ring-background-muted flex -space-x-2 *:data-[slot=avatar]:ring-1 *:data-[slot=avatar]:grayscale">
            <Avatar>
              <AvatarImage
                src="https://github.com/nahiyankhan.png"
                alt="@nahiyankhan"
              />
              <AvatarFallback>NK</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarImage src="https://github.com/baxen.png" alt="@baxen" />
              <AvatarFallback>BA</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarImage
                src="https://github.com/spencrmartin.png"
                alt="@spencrmartin"
              />
              <AvatarFallback>SM</AvatarFallback>
            </Avatar>
          </div>
        </CardFooter>
      </Card>
      <Card className="w-full @3xl:max-w-1/2">
        <CardHeader>
          <CardTitle>Is this an image?</CardTitle>
          <CardDescription>This is a card with an image.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <img
            src="/placeholder.svg"
            alt="placeholder"
            className="aspect-video size-full object-cover"
          />
        </CardContent>
        <CardFooter className="flex items-center gap-2">
          <Badge variant="outline">
            <BedIcon /> 4
          </Badge>
          <Badge variant="outline">
            <BathIcon /> 2
          </Badge>
          <Badge variant="outline">
            <LandPlotIcon /> 350m²
          </Badge>
          <div className="ml-auto  tabular-nums">$135,000</div>
        </CardFooter>
      </Card>
      <div className="grid w-full grid-cols-1 items-start gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="text-sm">Content Only</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Header Only</CardTitle>
            <CardDescription>
              This is a card with a header and a description.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Header and Content</CardTitle>
            <CardDescription>
              This is a card with a header and a content.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">Content</CardContent>
        </Card>
        <Card>
          <CardFooter className="text-sm">Footer Only</CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Header + Footer</CardTitle>
            <CardDescription>
              This is a card with a header and a footer.
            </CardDescription>
          </CardHeader>
          <CardFooter className="text-sm">Footer</CardFooter>
        </Card>
        <Card>
          <CardContent className="text-sm">Content</CardContent>
          <CardFooter className="text-sm">Footer</CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Header + Footer</CardTitle>
            <CardDescription>
              This is a card with a header and a footer.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">Content</CardContent>
          <CardFooter className="text-sm">Footer</CardFooter>
        </Card>
      </div>
    </div>
  );
}
