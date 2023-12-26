import { getLatestBlock } from './get-latest-block';

export async function getAuctionEndTime() {
    const block = await getLatestBlock();
    const oneHourS = 60 * 60;
    const deadline = block.timestamp + oneHourS;
    return deadline;
}
