import { Avatar, AvatarFallback, AvatarImage } from "ghost-ui";

export function AvatarDemo() {
  return (
    <div className="flex flex-row flex-wrap items-center gap-4">
      <Avatar>
        <AvatarImage
          src="https://github.com/nahiyankhan.png"
          alt="@nahiyankhan"
        />
        <AvatarFallback>NK</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>NK</AvatarFallback>
      </Avatar>
      <Avatar className="size-12">
        <AvatarImage
          src="https://github.com/nahiyankhan.png"
          alt="@nahiyankhan"
        />
        <AvatarFallback>NK</AvatarFallback>
      </Avatar>
      <Avatar className="rounded-lg">
        <AvatarImage
          src="https://github.com/spencrmartin.png"
          alt="@spencrmartin"
        />
        <AvatarFallback>SM</AvatarFallback>
      </Avatar>
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
      <div className="*:data-[slot=avatar]:ring-background-muted flex -space-x-2 *:data-[slot=avatar]:size-12 *:data-[slot=avatar]:ring-1 *:data-[slot=avatar]:grayscale">
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
      <div className="*:data-[slot=avatar]:ring-background-muted flex -space-x-2 hover:space-x-1 *:data-[slot=avatar]:size-12 *:data-[slot=avatar]:ring-1 *:data-[slot=avatar]:grayscale *:data-[slot=avatar]:transition-all *:data-[slot=avatar]:duration-300 *:data-[slot=avatar]:ease-in-out">
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
    </div>
  );
}
