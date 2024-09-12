"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { getUserOwnedCollections, getUserOwnedTokensByCollection } from "@/utils/aptos";
import { Collection } from "@/types/Collection";
import Image from "next/image";
import { Token } from "@/types/Token";
import { IoIosArrowDown } from "react-icons/io";
import { BsList } from "react-icons/bs";
import { BsFillGridFill } from "react-icons/bs";
import { Loading } from "@/components/Loading";
import { assetListingModalId, ListingModal } from "../ListingModal";

export function Body() {
    const { account } = useWallet();
    const [userOwnedCollections, setUserOwnedCollections] = useState<Collection[]>([]);
    const [chosenCollection, setChosenCollection] = useState<Collection | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dropdown, setDropdown] = useState(true);
    const [view, setView] = useState('grid');
    const getCollectionsOwnedByUser = useCallback(async () => {
        if (!account?.address) return;
        setIsLoading(true)
        try {
            const res = await getUserOwnedCollections(account.address)
            const ownedCollections: Collection[] = [];
            for (const collection of res) {
                ownedCollections.push({
                    collection_id: collection.current_collection?.collection_id ?? null,
                    collection_name: collection.collection_name ?? "Unknown Collection",
                    collection_uri: collection.collection_uri ?? null,
                    token_standard: collection.current_collection?.token_standard ?? null,
                })
            }
            setUserOwnedCollections(ownedCollections);
            if (ownedCollections.length > 0) {
                setChosenCollection(ownedCollections[0])
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }, [account?.address])
    useEffect(() => {
        getCollectionsOwnedByUser()
    }, [getCollectionsOwnedByUser])

    const handleCollectionSelect = (collection: Collection) => {
        setChosenCollection(collection)
        setDropdown(!dropdown); // Close the dropdown after selection
    };
    if (isLoading) return <Loading />
    return (
        <React.Fragment>
            <div className="content-header d-flex">
                <div className="collection">
                    <div className="dropdown-btn">
                        <span className="me-2 fs-6">Select Collection:</span>
                        <button className="rounded text-start coll-btn" onClick={() => setDropdown(!dropdown)}>
                            {
                                chosenCollection ? chosenCollection.collection_name : "Select Collection"
                            }
                            <IoIosArrowDown className="dd-icon" /></button>
                    </div>
                    <div className="coll-dropdown rounded" hidden={dropdown}>
                        {userOwnedCollections.map((collection, index) => (
                            <div className="coll-item" key={index} onClick={() => handleCollectionSelect(collection)}>
                                <p>{collection.collection_name} ({collection.token_standard})</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="view-type d-flex align-items-center">
                    <span className="me-2">View:</span>
                    <div className="dsp-layout">
                        <BsFillGridFill className={`layout-icon me-1 ${view == 'grid' ? 'active' : ''}`} onClick={() => setView('grid')} />
                        <BsList className={`layout-icon me-1 ${view == 'list' ? 'active' : ''}`} onClick={() => setView('list')} />
                    </div>
                </div>
            </div>
            <div className="content-body">
                <OwnedTokens viewtype={view} collectionId={chosenCollection?.collection_id ?? null} />
            </div>
        </React.Fragment>
    )
}

type OwnedTokensProps = {
    collectionId: string | null;
    viewtype: string;
};
function OwnedTokens({ collectionId, viewtype }: OwnedTokensProps) {
    const { account } = useWallet()
    const [tokens, setTokens] = useState<Token[]>([]);
    const [chosenToken, setChosenToken] = useState<Token | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const getOwnedTokensByCollection = useCallback(() => {
        if (!account?.address || !collectionId) {
            setIsLoading(false)
            return setTokens([])
        }
        setIsLoading(true)
        try {
            getUserOwnedTokensByCollection(account.address, collectionId).then((res) => {
                const ownedTokens: Token[] = [];
                for (const token of res) {
                    ownedTokens.push({
                        token_data_id: token.token_data_id,
                        token_icon_uri: token.current_token_data?.token_uri ?? null,
                        token_name: token.current_token_data?.token_name ?? "Unknown Token",
                        token_description: token.current_token_data?.description ?? "",
                        collection_id: token.current_token_data?.collection_id ?? "",
                        token_standard: token.current_token_data?.token_standard ?? null,
                        collection_name: token.current_token_data?.current_collection?.collection_name ?? "Unknown Collection"
                    })
                }
                setTokens(ownedTokens)
            })
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }, [account?.address, collectionId])
    useEffect(() => {
        getOwnedTokensByCollection()
    }, [getOwnedTokensByCollection]);
    if (isLoading) return <Loading />;
    return (
        <React.Fragment>
            <div className="all-cards pt-4 grid-view" hidden={viewtype == 'grid' ? false : true}>
                {
                    tokens.map((token, index) => (
                        <div className="card border-0" key={token.token_data_id}>
                            <Image src={`${token.token_icon_uri}`} className="card-img-top w-100" alt={token.token_name} width={150} height={200} />
                            {/* <Image src={`/media/nfts/${index+1}.jpeg`} className="card-img-top w-100" alt={token.token_name} width={150} height={200} /> */}
                            <div className="card-body">
                                <h4 className="card-title">{token.token_name}</h4>
                                {/* <p className="d-flex"><span>Collection:</span><span>{token.collection_name}</span></p> */}
                                <p className="d-flex"><span>{token.collection_name}</span></p>
                                <p className="d-flex"><span>Token Standard :</span><span>{token.token_standard}</span></p>

                                <p className="description">{token.token_description}</p>
                                <button onClick={() => setChosenToken(token)} data-bs-toggle="modal" data-bs-target={`#${assetListingModalId}`} className="btn list-btn w-100">List Asset</button>
                            </div>
                        </div>
                    ))
                }
            </div>

            <div className="pt-4 list-view" hidden={viewtype == 'list' ? false : true}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Token Name</th>
                            <th>Token Description</th>
                            <th className="text-center">Token Standard</th>
                            <th>Collection</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            tokens.map((token, index) => (
                                <tr key={index}>
                                    <td>
                                        <Image src={`/media/nfts/${index + 1}.jpeg`} className="rounded me-2" alt="nft" width={32} height={32} />
                                        <span className="fs-5">{token.token_name}</span>
                                    </td>
                                    <td>{token.token_description}</td>
                                    <td className="text-center">{token.token_standard}</td>
                                    <td>{token.collection_name}</td>
                                    <td>
                                        <button onClick={() => setChosenToken(token)} className="action-btn rounded" data-bs-toggle="modal" data-bs-target={`#${assetListingModalId}`}>List</button>
                                    </td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>
            <ListingModal token={chosenToken} />
        </React.Fragment>
    )
}