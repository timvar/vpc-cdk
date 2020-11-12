import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

export class VpcCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPCs

    const vpc1 = new ec2.Vpc(this, 'pepeVPC1', {
      cidr: '10.0.0.0/16',
      subnetConfiguration: [
        {
          name: 'pepePublic1',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    const vpc2 = new ec2.Vpc(this, 'pepeVPC2', {
      cidr: '10.1.0.0/16',
      subnetConfiguration: [
        {
          name: 'pepePublic2',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // Peering connections

    const peering = new ec2.CfnVPCPeeringConnection(this, 'pepePeering', {
      peerVpcId: vpc2.vpcId,
      vpcId: vpc1.vpcId,
    });

    // Routes for peering

    new ec2.CfnRoute(this, 'pepeRoutePeering', {
      routeTableId: vpc1.publicSubnets[0].routeTable.routeTableId,
      vpcPeeringConnectionId: peering.ref,
      destinationCidrBlock: '10.1.0.0/16'
    });

    new ec2.CfnRoute(this, 'pepeRoute2to1', {
      routeTableId: vpc2.publicSubnets[0].routeTable.routeTableId,
      vpcPeeringConnectionId: peering.ref,
      destinationCidrBlock: '10.0.0.0/16'
    });

  /*

  // NACL

  const pepeNacl = new ec2.NetworkAcl(this, 'pepeNACL', {
    vpc: vpc1,
      subnetSelection: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    const allIPv4 = ec2.AclCidr;
    const tcpRule = ec2.AclTraffic;

    pepeNacl.addEntry('allowHTTPOut', {
      cidr: allIPv4.anyIpv4(),
      ruleNumber: 50,
      traffic: tcpRule.tcpPort(80),
      direction: ec2.TrafficDirection.EGRESS,
      ruleAction: ec2.Action.ALLOW,
    });

    pepeNacl.addEntry('allowSSHOut', {
      cidr: allIPv4.anyIpv4(),
      ruleNumber: 60,
      traffic: tcpRule.tcpPort(22),
      direction: ec2.TrafficDirection.EGRESS,
      ruleAction: ec2.Action.ALLOW,
    });

    pepeNacl.addEntry('allowHTTPIn', {
      cidr: allIPv4.anyIpv4(),
      ruleNumber: 50,
      traffic: tcpRule.tcpPort(80),
      direction: ec2.TrafficDirection.INGRESS,
      ruleAction: ec2.Action.ALLOW,
    });

    pepeNacl.addEntry('allowSSHIn', {
      cidr: allIPv4.anyIpv4(),
      ruleNumber: 60,
      traffic: tcpRule.tcpPort(22),
      direction: ec2.TrafficDirection.INGRESS,
      ruleAction: ec2.Action.ALLOW,
    });

    // User data
    
    const pepeUserData = ec2.UserData.forLinux()
    pepeUserData.addCommands(
      'sudo yum update',
      '',
      '',
    );

    */

    const pepeSecurityGroup1 = new ec2.SecurityGroup(this, 'PepeSG1', {
      vpc: vpc1,
      allowAllOutbound: true,
    });

    pepeSecurityGroup1.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    pepeSecurityGroup1.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));
    pepeSecurityGroup1.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.icmpPing());

    const pepeLinuxImage = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
    });

    new ec2.Instance(this, 'pepeInstancePublic1', {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: pepeLinuxImage,
      vpc: vpc1,
      securityGroup: pepeSecurityGroup1,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    const pepeSecurityGroup2 = new ec2.SecurityGroup(this, 'PepeSG2', {
      vpc: vpc2,
      allowAllOutbound: true,
    });

    pepeSecurityGroup2.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    pepeSecurityGroup2.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));
    pepeSecurityGroup2.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.icmpPing());

    new ec2.Instance(this, 'pepeInstancePublic2', {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: pepeLinuxImage,
      vpc: vpc2,
      securityGroup: pepeSecurityGroup2,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });
  }
}
