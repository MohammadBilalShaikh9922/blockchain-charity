// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Transparent Charity Platform (educational mini project)
/// @notice Donation records are public and verifiable on-chain.
/// This contract is a demonstration and has not been audited.
contract CharityPlatform {
    struct Campaign {
        address payable creator;
        string title;
        string description;
        uint256 goalWei;
        uint256 totalRaisedWei;
        bool active;
    }

    struct Donation {
        address donor;
        uint256 amountWei;
        uint256 timestamp;
    }

    uint256 public campaignCount;
    mapping(uint256 => Campaign) private campaigns;
    mapping(uint256 => Donation[]) private donations;

    event CampaignCreated(uint256 indexed campaignId, address indexed creator, string title, uint256 goalWei);
    event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amountWei, uint256 timestamp);
    event CampaignClosed(uint256 indexed campaignId, address indexed creator);

    modifier validCampaign(uint256 campaignId) {
        require(campaignId > 0 && campaignId <= campaignCount, "Invalid campaign");
        _;
    }

    function createCampaign(
        string calldata title,
        string calldata description,
        uint256 goalWei
    ) external {
        require(bytes(title).length > 0, "Title required");
        require(goalWei > 0, "Goal must be positive");
        campaignCount++;
        campaigns[campaignCount] = Campaign({
            creator: payable(msg.sender),
            title: title,
            description: description,
            goalWei: goalWei,
            totalRaisedWei: 0,
            active: true
        });
        emit CampaignCreated(campaignCount, msg.sender, title, goalWei);
    }

    function donate(uint256 campaignId) external payable validCampaign(campaignId) {
        Campaign storage c = campaigns[campaignId];
        require(c.active, "Campaign closed");
        require(msg.value > 0, "Donation must be positive");
        c.totalRaisedWei += msg.value;
        donations[campaignId].push(Donation({
            donor: msg.sender,
            amountWei: msg.value,
            timestamp: block.timestamp
        }));
        emit DonationReceived(campaignId, msg.sender, msg.value, block.timestamp);
    }

    function closeCampaign(uint256 campaignId) external validCampaign(campaignId) {
        Campaign storage c = campaigns[campaignId];
        require(msg.sender == c.creator, "Only creator can close");
        require(c.active, "Already closed");
        c.active = false;
        emit CampaignClosed(campaignId, msg.sender);
    }

    function withdraw(uint256 campaignId) external validCampaign(campaignId) {
        Campaign storage c = campaigns[campaignId];
        require(msg.sender == c.creator, "Only creator can withdraw");
        uint256 amount = c.totalRaisedWei;
        require(amount > 0, "No funds to withdraw");
        c.totalRaisedWei = 0;
        (bool ok, ) = c.creator.call{value: amount}("");
        require(ok, "Transfer failed");
    }

    function getCampaign(uint256 campaignId) external view validCampaign(campaignId) returns (
        address creator,
        string memory title,
        string memory description,
        uint256 goalWei,
        uint256 totalRaisedWei,
        bool active
    ) {
        Campaign storage c = campaigns[campaignId];
        return (c.creator, c.title, c.description, c.goalWei, c.totalRaisedWei, c.active);
    }

    function getDonationCount(uint256 campaignId) external view validCampaign(campaignId) returns (uint256) {
        return donations[campaignId].length;
    }

    function getDonation(uint256 campaignId, uint256 index) external view validCampaign(campaignId) returns (
        address donor,
        uint256 amountWei,
        uint256 timestamp
    ) {
        require(index < donations[campaignId].length, "Invalid donation index");
        Donation storage d = donations[campaignId][index];
        return (d.donor, d.amountWei, d.timestamp);
    }
}
