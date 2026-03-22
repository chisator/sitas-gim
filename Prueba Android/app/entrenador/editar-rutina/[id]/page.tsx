

import ClientPage from "./client";

export const dynamicParams = false;

export async function generateStaticParams() {
    return [{ id: 'dummy' }];
}

export default function Page({ params }: { params: { id: string } }) {
    return <ClientPage params={params} />;
}
