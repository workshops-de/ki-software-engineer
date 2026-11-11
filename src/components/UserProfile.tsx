export type UserProfileData = {
	name: string;
	email: string;
	role: string;
	bio: string;
	avatarUrl?: string;
};

export const exampleUser: UserProfileData = {
	name: "Alex Morgan",
	email: "alex.morgan@example.com",
	role: "Software Engineer",
	bio: "Building useful things and learning something new every day.",
};

type UserProfileProps = {
	user?: UserProfileData;
};

export default function UserProfile({ user = exampleUser }: UserProfileProps) {
	const initials = user.name
		.split(" ")
		.map((part) => part[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase();

	return (
		<article className="user-profile" aria-label={`${user.name}'s profile`}>
			{user.avatarUrl ? (
				<img className="user-profile__avatar" src={user.avatarUrl} alt="" />
			) : (
				<div className="user-profile__avatar" aria-hidden="true">
					{initials}
				</div>
			)}
			<div className="user-profile__details">
				<h2>{user.name}</h2>
				<p>{user.role}</p>
				<p>{user.bio}</p>
				<a href={`mailto:${user.email}`}>{user.email}</a>
			</div>
		</article>
	);
}
