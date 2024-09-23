"use client";
import { User } from "@/types/ApiInterface";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI } from "@/utils/env";
const DISCORD_OAUTH_URI = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${DISCORD_REDIRECT_URI}&scope=identify`
import { FaDiscord } from "react-icons/fa";
export function DiscordNotification() {
    const router = useRouter()
    const { account } = useWallet();
    const searchParams = useSearchParams();
    const code = searchParams.get("code");
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false)
    const getUser = useCallback(async () => {
        if (!account?.address) return;
        try {
            setLoading(true)
            const res = await fetch(`/api/discord?address=${account.address}`);
            const response = await res.json();
            if (res.ok) {
                setUser(response.data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [account?.address]);
    const verifyDiscord = useCallback(async () => {
        if (!account?.address || !code || code === "") {
            return
        }
        try {
            setIsVerifying(true)
            const data = new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code.toString(),
                redirect_uri: DISCORD_REDIRECT_URI,
            })

            const res = await fetch(
                'https://discord.com/api/oauth2/token',
                {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: data
                }
            );
            if (!res.ok) {
                throw new Error("Sorry an error occured, we are on the issue")
            }
            const response = await res.json();
            const access_token = response.access_token;
            const userRes = await fetch(
                'https://discord.com/api/v10/users/@me',
                {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                    }
                }
            );
            if (!userRes.ok) {
                throw new Error("Sorry an error occured, we are on the issue")
            }
            const userResponse = await userRes.json();
            const bindRes = await fetch("/api/discord", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    address: account.address,
                    discordId: userResponse.id,
                    discordUsername: userResponse.username
                })
            });
            const bindResponse = await bindRes.json();
            if (!bindRes.ok) {
                throw new Error(bindResponse.message)
            }
            toast.success("Notifications started")
            await getUser()
        } catch (error: unknown) {
            let errorMessage = 'An unexpected error occurred';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            toast.error(errorMessage);
        } finally {
            router.push("/")
            setIsVerifying(false)
        }
    }, [account?.address, code, router, getUser])
    const updateNotification = async () => {
        if (!account?.address || !user || !user.discordId) return;
        try {
            const res = await fetch(`/api/discord?address=${account?.address}`, {
                method: "PUT"
            });
            const response = await res.json();
            if (!res.ok) {
                throw new Error(response.message)
            }
            await getUser()
        } catch (error: unknown) {
            let errorMessage = 'An unexpected error occurred';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            toast.error(errorMessage);
        }
    }
    useEffect(() => {
        verifyDiscord()
    }, [verifyDiscord])
    useEffect(() => {
        getUser()
    }, [getUser])
    if (!account?.address) return null;
    return (
        <div className="dropdown">
            <button disabled={loading || isVerifying} className="btn connect-btn dropdown-toggle border-0 p-2 rounded-circle me-3" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <FaDiscord />
            </button>
            {/* <FaDiscord type="button" disabled={loading || isVerifying} className="btn btn-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false"/> */}
            <ul className="dropdown-menu p-0 bg-dark">
                <li className="border-0 p-2 rounded">
                    {
                        (!user || !user.discordId) && <Link href={DISCORD_OAUTH_URI} className="btn connect-btn m-0 w-100 border-0">Enable Notification</Link>
                    }
                    {
                        user && user.discordId
                        &&
                        <div>
                            <p>{user.discordUsername}</p>
                            <p><span>Notifcation: </span>
                                <button className="btn ms-3 action-btn p-2" onClick={() => updateNotification()}>
                                    {user.isNotification ? "On" : "Off"}
                                </button>
                            </p>
                        </div>
                    }
                </li>
            </ul>
        </div>
    )
}