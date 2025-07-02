import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import { DeploymentType } from '../../env';

export enum ServerFeature {
  Captcha = 'captcha',
  Copilot = 'copilot',
  CopilotEmbedding = 'copilot_embedding',
  Payment = 'payment',
  OAuth = 'oauth',
  Indexer = 'indexer',
}

registerEnumType(ServerFeature, {
  name: 'ServerFeature',
});

registerEnumType(DeploymentType, {
  name: 'ServerDeploymentType',
});

@ObjectType()
export class ServerConfigType {
  @Field({
    description:
      'server identical name could be shown as badge on user interface',
  })
  name!: string;

  @Field({ description: 'server version' })
  version!: string;

  @Field({ description: 'server base url' })
  baseUrl!: string;

  @Field(() => DeploymentType, { description: 'server type' })
  type!: DeploymentType;

  @Field(() => [ServerFeature], { description: 'enabled server features' })
  features!: ServerFeature[];

  @Field(() => Boolean, {
    description: 'Whether allow guest users to create demo workspaces.',
  })
  allowGuestDemoWorkspace!: boolean;
}
