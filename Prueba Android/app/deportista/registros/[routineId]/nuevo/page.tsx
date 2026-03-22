

import ClientPage from "./client";

export const dynamicParams = false;

export async function generateStaticParams() {
    return [{ routineId: 'dummy' }];
}

export default function Page({ params }: { params: { routineId: string } }) {
    return <ClientPage params={params} />;
}
